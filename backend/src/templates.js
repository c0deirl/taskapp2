const Handlebars = require('handlebars');

function render(template, context) {
  const tpl = Handlebars.compile(template || '');
  return tpl(context);
}

module.exports = { render };
