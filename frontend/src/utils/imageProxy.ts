/**
 * 图片展示 URL：直接使用接口返回的地址（本地 /uploads/ 或其它），不再走代理。
 * 小红书图已通过 download_xhs_images.py 迁移到 backend/public/uploads/xhs/。
 */
export function getDisplayImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  return url;
}
