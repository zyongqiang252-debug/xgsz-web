const api = require('./api');

function visible(rows) {
  return (rows || []).filter((row) => row && row.published !== false);
}

function splitTags(value) {
  return String(value || '').split('/').map((item) => item.trim()).filter(Boolean);
}

function displayDate(value) {
  return String(value || '').split('-').filter(Boolean).join('.');
}

function normalize(raw) {
  const source = raw || {};
  const content = Object.assign({}, source);
  const pages = Object.assign({}, source.pages || {});
  const global = Object.assign({}, pages.global || {});
  const home = Object.assign({}, pages.home || {});
  const productsPage = Object.assign({}, pages.products || {});
  const about = Object.assign({}, pages.about || {});
  const contact = Object.assign({}, pages.contact || {});

  global.logo = api.assetUrl(global.logo);
  home.heroImage = api.assetUrl(home.heroImage);
  home.capabilities = (home.capabilities || []).map((item) => {
    const match = /#\/products\?solution=([^&]+)/.exec(item.link || '');
    return Object.assign({}, item, {
      solutionKey: match ? decodeURIComponent(match[1]) : ''
    });
  });
  home.industries = (home.industries || []).map((item) =>
    Object.assign({}, item, { tagList: splitTags(item.tags) })
  );

  productsPage.solutionGroups = (productsPage.solutionGroups || []).map((solution) =>
    Object.assign({}, solution, {
      groups: (solution.groups || []).map((group) =>
        Object.assign({}, group, {
          items: String(group.items || '').split('\n').map((item) => item.trim()).filter(Boolean)
        })
      )
    })
  );

  about.milestones = (about.milestones || [])
    .filter((item) => item && item.title)
    .sort((first, second) => String(second.date || '').localeCompare(String(first.date || '')))
    .map((item) => Object.assign({}, item, { displayDate: displayDate(item.date) }));
  about.introImage = api.assetUrl(about.introImage);
  about.introParagraphs = String(about.introBody || '').split('\n').map((item) => item.trim()).filter(Boolean);

  content.pages = Object.assign({}, pages, {
    global,
    home,
    products: productsPage,
    about,
    contact
  });
  content.settings = source.settings || {};
  content.categories = (source.categories || [])
    .filter((category) => category && category.enabled !== false)
    .map((category) => ({ key: category.key || String(category.id), name: category.name }));
  content.products = visible(source.products).map((product) =>
    Object.assign({}, product, {
      coverImage: api.assetUrl(product.coverImage),
      detailImages: (product.detailImages || []).map(api.assetUrl),
      features: product.features || []
    })
  );
  const productOrder = {};
  (source.productCarousels || []).forEach((group) => {
    (group.products || []).forEach((id) => {
      if (productOrder[id] === undefined) productOrder[id] = Object.keys(productOrder).length;
    });
  });
  content.products.sort((first, second) => {
    const firstOrder = productOrder[first.productId] === undefined ? 999999 : productOrder[first.productId];
    const secondOrder = productOrder[second.productId] === undefined ? 999999 : productOrder[second.productId];
    return firstOrder - secondOrder;
  });
  content.services = visible(source.services).map((service) =>
    Object.assign({}, service, { items: service.items || [] })
  );
  content.brands = visible(source.brands).map((brand) =>
    Object.assign({}, brand, { logo: api.assetUrl(brand.logo) })
  );
  content.certificates = visible(source.certificates).map((item) =>
    Object.assign({}, item, { imageUrl: api.assetUrl(item.imageUrl) })
  );
  content.carousels = visible(source.carousels).map((item) =>
    Object.assign({}, item, { imageUrl: api.assetUrl(item.imageUrl) })
  );
  if (content.carousels.length && content.carousels[0].imageUrl) {
    content.pages.home.heroImage = content.carousels[0].imageUrl;
  }
  content.abouts = visible(source.abouts).map((item) =>
    Object.assign({}, item, { imageUrl: api.assetUrl(item.imageUrl) })
  );
  content.businesses = visible(source.businesses);
  content.basicInformation = source.basicInformation || [];
  return content;
}

module.exports = {
  normalize,
  splitTags,
  displayDate
};
