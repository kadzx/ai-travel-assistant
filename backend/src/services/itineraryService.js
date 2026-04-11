const { Itinerary } = require('../models');
const aiService = require('./aiService');
const mapService = require('./mapService');
const logger = require('../utils/logger');

const DEFAULT_TIMEZONE = 'Asia/Shanghai';
const NODE_STATUS = ['planned', 'done', 'skipped'];

function buildNodeId(index) {
  return `n_${Date.now().toString(36)}_${index.toString(36)}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeNode(rawNode, index) {
  const dayIndex = Math.max(1, toNumber(rawNode?.dayIndex, 1));
  const sequence = Math.max(1, toNumber(rawNode?.sequence, index + 1));
  const status = NODE_STATUS.includes(rawNode?.status) ? rawNode.status : 'planned';

  return {
    id: rawNode?.id ? String(rawNode.id) : buildNodeId(index + 1),
    dayIndex,
    sequence,
    timeSlot: rawNode?.timeSlot || '',
    title: rawNode?.title || rawNode?.activity || `行程节点 ${index + 1}`,
    location: rawNode?.location || '',
    latitude: rawNode?.latitude ?? null,
    longitude: rawNode?.longitude ?? null,
    address: rawNode?.address || '',
    transport: rawNode?.transport || '',
    cost: Math.max(0, toNumber(rawNode?.cost, 0)),
    durationMin: Math.max(0, toNumber(rawNode?.durationMin, 0)),
    notes: rawNode?.notes || '',
    status
  };
}

function normalizeNodes(rawNodes = []) {
  const nodes = Array.isArray(rawNodes) ? rawNodes.map(normalizeNode) : [];

  nodes.sort((a, b) => {
    if (a.dayIndex === b.dayIndex) return a.sequence - b.sequence;
    return a.dayIndex - b.dayIndex;
  });

  const counters = {};
  return nodes.map((node, index) => {
    const day = node.dayIndex;
    counters[day] = (counters[day] || 0) + 1;
    return {
      ...node,
      id: node.id || buildNodeId(index + 1),
      sequence: counters[day]
    };
  });
}

function normalizeLinearContent(rawContent, fallback = {}) {
  if (rawContent && typeof rawContent === 'object' && Array.isArray(rawContent.nodes)) {
    const normalizedNodes = normalizeNodes(rawContent.nodes);
    return {
      version: rawContent.version || 'v1',
      timezone: rawContent.timezone || DEFAULT_TIMEZONE,
      destination: rawContent.destination || fallback.destination || '',
      startDate: rawContent.startDate || fallback.startDate || null,
      endDate: rawContent.endDate || fallback.endDate || null,
      travelers: toNumber(rawContent.travelers, fallback.travelers || 1),
      budgetLevel: rawContent.budgetLevel || fallback.budgetLevel || 'medium',
      styleTags: Array.isArray(rawContent.styleTags) ? rawContent.styleTags : [],
      nodes: normalizedNodes,
      summary: {
        totalDays: Math.max(1, ...normalizedNodes.map(n => n.dayIndex), 1),
        totalNodes: normalizedNodes.length,
        estimatedCost: normalizedNodes.reduce((sum, node) => sum + toNumber(node.cost, 0), 0)
      }
    };
  }

  if (Array.isArray(rawContent)) {
    return normalizeLinearContent({ nodes: rawContent }, fallback);
  }

  if (typeof rawContent === 'string' && rawContent.trim()) {
    return normalizeLinearContent({
      nodes: [
        {
          id: 'legacy_1',
          dayIndex: 1,
          sequence: 1,
          title: '旧版行程',
          notes: rawContent,
          status: 'planned'
        }
      ]
    }, fallback);
  }

  return normalizeLinearContent({ nodes: [] }, fallback);
}

function convertAIResultToLinear(result, params = {}) {
  // Already linear format
  if (result && typeof result === 'object' && Array.isArray(result.nodes)) {
    return normalizeLinearContent(result, {
      destination: params.destination,
      travelers: params.travelers
    });
  }

  // Adapt old AI format: { title, overview, days: [{ activities: [...] }] }
  if (result && typeof result === 'object' && Array.isArray(result.days)) {
    const nodes = [];
    result.days.forEach((dayItem, dayIdx) => {
      const activities = Array.isArray(dayItem.activities) ? dayItem.activities : [];
      activities.forEach((activity, seqIdx) => {
        nodes.push({
          id: buildNodeId(nodes.length + 1),
          dayIndex: dayIdx + 1,
          sequence: seqIdx + 1,
          timeSlot: activity.time || '',
          title: activity.activity || activity.title || `Day ${dayIdx + 1} 活动 ${seqIdx + 1}`,
          location: activity.location || '',
          latitude: activity.latitude ?? null,
          longitude: activity.longitude ?? null,
          notes: activity.notes || '',
          status: 'planned'
        });
      });
    });

    return normalizeLinearContent({
      version: 'v1',
      timezone: DEFAULT_TIMEZONE,
      destination: params.destination || '',
      travelers: toNumber(params.travelers, 1),
      budgetLevel: params.budget || 'medium',
      styleTags: Array.isArray(params.interests) ? params.interests : [],
      nodes
    });
  }

  // Fallback text response
  return normalizeLinearContent(
    typeof result === 'string' ? result : JSON.stringify(result || {}),
    {
      destination: params.destination || '',
      travelers: toNumber(params.travelers, 1)
    }
  );
}

class ItineraryService {
  /**
   * Generate itinerary using AI
   * @param {Object} data - User preferences
   * @returns {Promise<Object>} Generated itinerary data
   */
  async generate(data) {
    try {
      const generatedContent = await aiService.generateItinerary(data);
      const linear = convertAIResultToLinear(generatedContent, data);
      // 用腾讯地图 API 补全缺失的经纬度
      try {
        linear.nodes = await mapService.enrichNodesWithCoords(linear.nodes, data.destination || '');
      } catch (e) {
        logger.warn('MapService enrichNodesWithCoords failed, skip:', e.message);
      }
      return linear;
    } catch (error) {
      logger.error('ItineraryService generate error:', error);
      throw error;
    }
  }

  /**
   * Create (save) an itinerary
   * @param {Number} userId 
   * @param {Object} data 
   * @returns {Promise<Itinerary>}
   */
  async create(userId, data) {
    try {
      const { title, content, start_date, end_date } = data;
      const normalizedContent = normalizeLinearContent(content, {
        destination: data.destination || '',
        startDate: start_date || null,
        endDate: end_date || null,
        travelers: data.travelers || 1,
        budgetLevel: data.budgetLevel || 'medium'
      });
      const itinerary = await Itinerary.create({
        user_id: userId,
        title,
        content: normalizedContent,
        start_date,
        end_date
      });
      return itinerary;
    } catch (error) {
      logger.error('ItineraryService create error:', error);
      throw error;
    }
  }

  /**
   * List user's itineraries
   * @param {Number} userId 
   * @returns {Promise<Array<Itinerary>>}
   */
  async list(userId) {
    try {
      const list = await Itinerary.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });
      return list.map(item => {
        const plain = item.toJSON();
        plain.content = normalizeLinearContent(plain.content, {
          startDate: plain.start_date,
          endDate: plain.end_date
        });
        return plain;
      });
    } catch (error) {
      logger.error('ItineraryService list error:', error);
      throw error;
    }
  }

  /**
   * Get itinerary details
   * @param {Number} id 
   * @param {Number} userId 
   * @returns {Promise<Itinerary>}
   */
  async getDetail(id, userId) {
    try {
      const itinerary = await Itinerary.findOne({
        where: { id, user_id: userId }
      });
      if (!itinerary) return null;
      const plain = itinerary.toJSON();
      plain.content = normalizeLinearContent(plain.content, {
        startDate: plain.start_date,
        endDate: plain.end_date
      });
      return plain;
    } catch (error) {
      logger.error('ItineraryService getDetail error:', error);
      throw error;
    }
  }

  async update(userId, id, data) {
    const itinerary = await Itinerary.findOne({ where: { id, user_id: userId } });
    if (!itinerary) return null;
    const current = itinerary.toJSON();
    const normalizedContent = normalizeLinearContent(data.content ?? current.content, {
      destination: data.destination || current.content?.destination || '',
      startDate: data.start_date || current.start_date || null,
      endDate: data.end_date || current.end_date || null,
      travelers: data.travelers || current.content?.travelers || 1,
      budgetLevel: data.budgetLevel || current.content?.budgetLevel || 'medium'
    });
    await itinerary.update({
      title: data.title ?? current.title,
      content: normalizedContent,
      start_date: data.start_date ?? current.start_date,
      end_date: data.end_date ?? current.end_date
    });
    const next = itinerary.toJSON();
    next.content = normalizedContent;
    return next;
  }

  async updateNode(userId, id, nodeId, patch) {
    const itinerary = await Itinerary.findOne({ where: { id, user_id: userId } });
    if (!itinerary) return null;
    const content = normalizeLinearContent(itinerary.content, {
      startDate: itinerary.start_date,
      endDate: itinerary.end_date
    });
    const targetIndex = content.nodes.findIndex(node => String(node.id) === String(nodeId));
    if (targetIndex < 0) return null;
    content.nodes[targetIndex] = normalizeNode(
      { ...content.nodes[targetIndex], ...patch, id: content.nodes[targetIndex].id },
      targetIndex
    );
    content.nodes = normalizeNodes(content.nodes);
    content.summary = {
      totalDays: Math.max(1, ...content.nodes.map(n => n.dayIndex), 1),
      totalNodes: content.nodes.length,
      estimatedCost: content.nodes.reduce((sum, node) => sum + toNumber(node.cost, 0), 0)
    };
    await itinerary.update({ content });
    return itinerary.toJSON();
  }

  async addNode(userId, id, node) {
    const itinerary = await Itinerary.findOne({ where: { id, user_id: userId } });
    if (!itinerary) return null;
    const content = normalizeLinearContent(itinerary.content, {
      startDate: itinerary.start_date,
      endDate: itinerary.end_date
    });
    content.nodes.push(normalizeNode(node || {}, content.nodes.length));
    content.nodes = normalizeNodes(content.nodes);
    content.summary = {
      totalDays: Math.max(1, ...content.nodes.map(n => n.dayIndex), 1),
      totalNodes: content.nodes.length,
      estimatedCost: content.nodes.reduce((sum, n) => sum + toNumber(n.cost, 0), 0)
    };
    await itinerary.update({ content });
    return itinerary.toJSON();
  }

  async deleteItinerary(userId, id) {
    const itinerary = await Itinerary.findOne({ where: { id, user_id: userId } });
    if (!itinerary) return null;
    await itinerary.destroy();
    return true;
  }

  async deleteNode(userId, id, nodeId) {
    const itinerary = await Itinerary.findOne({ where: { id, user_id: userId } });
    if (!itinerary) {
      console.log('[deleteNode] itinerary not found, id:', id, 'userId:', userId);
      return null;
    }
    const content = normalizeLinearContent(itinerary.content, {
      startDate: itinerary.start_date,
      endDate: itinerary.end_date
    });
    const before = content.nodes.length;
    console.log('[deleteNode] nodeId:', nodeId, 'existing ids:', content.nodes.map(n => n.id));
    content.nodes = content.nodes.filter(node => String(node.id) !== String(nodeId));
    if (content.nodes.length === before) {
      console.log('[deleteNode] no node matched');
      return null;
    }
    content.nodes = normalizeNodes(content.nodes);
    content.summary = {
      totalDays: Math.max(1, ...content.nodes.map(n => n.dayIndex), 1),
      totalNodes: content.nodes.length,
      estimatedCost: content.nodes.reduce((sum, n) => sum + toNumber(n.cost, 0), 0)
    };
    await itinerary.update({ content });
    return itinerary.toJSON();
  }

  async reorderNodes(userId, id, orders) {
    const itinerary = await Itinerary.findOne({ where: { id, user_id: userId } });
    if (!itinerary) return null;
    const content = normalizeLinearContent(itinerary.content, {
      startDate: itinerary.start_date,
      endDate: itinerary.end_date
    });
    const orderMap = new Map();
    (Array.isArray(orders) ? orders : []).forEach(item => {
      if (!item || !item.nodeId) return;
      orderMap.set(String(item.nodeId), {
        dayIndex: Math.max(1, toNumber(item.dayIndex, 1)),
        sequence: Math.max(1, toNumber(item.sequence, 1))
      });
    });
    content.nodes = content.nodes.map(node => {
      const next = orderMap.get(String(node.id));
      if (!next) return node;
      return {
        ...node,
        dayIndex: next.dayIndex,
        sequence: next.sequence
      };
    });
    content.nodes = normalizeNodes(content.nodes);
    content.summary = {
      totalDays: Math.max(1, ...content.nodes.map(n => n.dayIndex), 1),
      totalNodes: content.nodes.length,
      estimatedCost: content.nodes.reduce((sum, n) => sum + toNumber(n.cost, 0), 0)
    };
    await itinerary.update({ content });
    return itinerary.toJSON();
  }
}

module.exports = new ItineraryService();
