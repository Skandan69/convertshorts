import {getBillingConfig} from './config.js';
import {priceCatalogSection,mountPriceCatalog} from './price-table.js';
const section=document.querySelector('#fal-prices');
if(section){mountPriceCatalog(section);getBillingConfig().then(info=>{if(info.usdInr){const template=document.createElement('template');template.innerHTML=priceCatalogSection(info);section.replaceWith(template.content);mountPriceCatalog(document.querySelector('#fal-prices'));}});}
