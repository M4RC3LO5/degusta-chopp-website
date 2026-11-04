-- Seed gerado a partir de src/data/products.js (5 sabores, 3 marcas, 15 ofertas, settings)
-- Idempotente: pode ser reexecutado.

insert into public.brands (slug, name, logo_path, sort_order) values
  ('bru', 'Bru', null, 1),
  ('germania', 'Germânia', null, 2),
  ('brahma', 'Brahma', null, 3)
on conflict (slug) do nothing;

insert into public.flavors (slug, name, abv, ibu, description, ideal_for, badge, badge_color, image_path, sort_order) values
  ('pilsen', 'Chopp Pilsen', 4.5, 12, 'Leve, refrescante e muito cremoso. O clássico indispensável para qualquer churrasco ou celebração.', 'Churrascos, festas e reuniões familiares.', 'MAIS PEDIDO', 'amber', null, 1),
  ('escuro', 'Chopp Escuro', 4.8, 15, 'Notas sutilmente adocicadas e maltes torrados. Ideal para quem aprecia um chopp marcante e harmonioso.', 'Noites frias, carnes e eventos noturnos.', 'SABOR INCORPADO', 'amber', null, 2),
  ('puro-malte', 'Chopp Puro Malte', 5, 18, 'Feito exclusivamente com malte de cevada e lúpulos selecionados. Amargor equilibrado e aroma inconfundível.', 'Apreciadores de cerveja puro malte.', '100% MALTE', 'emerald', null, 3),
  ('ipa', 'Chopp IPA', 6.2, 45, 'Para amantes de lúpulo intenso! Aromas cítricos, amargor presente e colarinho denso e persistente.', 'Hambúrgueres gourmet e carnes nobres.', 'LUPULADO PREMIUM', 'yellow', null, 4),
  ('vinho', 'Chopp de Vinho', 5.5, 8, 'A combinação perfeita entre a leveza do chopp e o sabor marcante do vinho tinto de mesa. Doce e refrescante.', 'Recepções, festas e comemorações.', 'SUCESSO DAS FESTAS', 'purple', null, 5)
on conflict (slug) do nothing;

insert into public.offers (flavor_id, brand_id, subtitle, price_30, price_50, active) values
  ((select id from public.flavors where slug='pilsen'), (select id from public.brands where slug='bru'), 'Custo-benefício', 380.00, 590.00, true),
  ((select id from public.flavors where slug='pilsen'), (select id from public.brands where slug='germania'), 'Tradição artesanal', 420.00, 650.00, true),
  ((select id from public.flavors where slug='pilsen'), (select id from public.brands where slug='brahma'), 'Qualidade nacional', 490.00, 780.00, true),
  ((select id from public.flavors where slug='escuro'), (select id from public.brands where slug='bru'), 'Maltes torrados', 410.00, 640.00, true),
  ((select id from public.flavors where slug='escuro'), (select id from public.brands where slug='germania'), 'Dunkel tradicional', 450.00, 690.00, true),
  ((select id from public.flavors where slug='escuro'), (select id from public.brands where slug='brahma'), 'Black cremoso', 520.00, 820.00, true),
  ((select id from public.flavors where slug='puro-malte'), (select id from public.brands where slug='bru'), 'Puro e equilibrado', 430.00, 670.00, true),
  ((select id from public.flavors where slug='puro-malte'), (select id from public.brands where slug='germania'), 'Puro malte artesanal', 470.00, 720.00, true),
  ((select id from public.flavors where slug='puro-malte'), (select id from public.brands where slug='brahma'), 'Brahma Duplo Malte', 550.00, 850.00, true),
  ((select id from public.flavors where slug='ipa'), (select id from public.brands where slug='bru'), 'IPA aromática', 480.00, 760.00, true),
  ((select id from public.flavors where slug='ipa'), (select id from public.brands where slug='germania'), 'IPA especial', 520.00, 810.00, true),
  ((select id from public.flavors where slug='ipa'), (select id from public.brands where slug='brahma'), 'Colorado / IPA', 590.00, 920.00, true),
  ((select id from public.flavors where slug='vinho'), (select id from public.brands where slug='bru'), 'Grape Beer cremoso', 440.00, 690.00, true),
  ((select id from public.flavors where slug='vinho'), (select id from public.brands where slug='germania'), 'Vinho tradicional', 480.00, 740.00, true),
  ((select id from public.flavors where slug='vinho'), (select id from public.brands where slug='brahma'), 'Seleção especial', 560.00, 880.00, true)
on conflict (flavor_id, brand_id) do nothing;

insert into public.settings (id, whatsapp, promo_min_liters, business_hours, regions, payment_info, instagram) values
  (1, '5511991069099', 50, 'Segunda a Sábado das 08h às 20h', 'São Paulo (Capital), Grande SP, Região do ABC, Osasco, Barueri, Alphaville e Guarulhos.', 'Pix, Cartões de Crédito (até 12x) e Débito no momento da entrega.', 'degustachopp')
on conflict (id) do nothing;

