/**
 * Internationalization Middleware / 国际化中间件
 * Detects language from 'lang' query param or 'Accept-Language' header.
 * Defaults to 'zh'.
 */
const i18n = (req, res, next) => {
  const langQuery = req.query.lang;
  const langHeader = req.headers['accept-language'];
  
  if (langQuery && (langQuery === 'en' || langQuery === 'zh')) {
    req.lang = langQuery;
  } else if (langHeader && langHeader.includes('en')) {
    req.lang = 'en';
  } else {
    req.lang = 'zh'; // Default
  }
  
  next();
};

module.exports = i18n;
