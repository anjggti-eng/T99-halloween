-- ====================================================================
-- T99 HALLOWEEN - SEED DAS 14 FANTASIAS OFICIAIS NO SUPABASE
-- Executar no SQL Editor do Supabase (http://192.168.3.108:8000)
-- Insere ou atualiza todas as 14 fantasias mantendo os votos zerados
-- ====================================================================

-- 1. Juliana Mendes - Noiva Cadáver Gótica
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_noiva_cadaver',
  'Juliana Mendes',
  'Noiva Cadáver Gótica',
  'Terror Clássico',
  'Vestido de noiva centenário rendado e esfarrapado, véu sombrio, maquiagem cadavérica azulada com buquê de rosas negras secas.',
  '["https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1572945281869-8269d0d9703f?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T20:00:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 2. Lucas Silveira - Lorde Drácula Vitoriano
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_conde_dracula',
  'Lucas Silveira',
  'Lorde Drácula Vitoriano',
  'Terror Clássico',
  'Capa preta de veludo com gola alta escarlate, dentes caninos hiper-realistas, palidez vampírica e medalhão ancestral dos Cárpatos.',
  '["https://images.unsplash.com/photo-1603792907191-89e55f70071a?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T20:10:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 3. Beatriz Alencar - Bruxa Ancestral de Salem
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_bruxa_salem',
  'Beatriz Alencar',
  'Bruxa Ancestral de Salem',
  'Mítico & Sobrenatural',
  'Túnica rústica de bruxaria ancestral, cajado com crânio entalhado em madeira negra, grimório de feitiços e olhos brancos assustadores.',
  '["https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T20:20:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 4. Diego Martinez - Palhaço Macabro do Circo Sombrio
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_palhaco_macabro',
  'Diego Martinez',
  'Palhaço Macabro do Circo Sombrio',
  'Criativo & Engraçado',
  'Traje circense vintage manchado, sorriso de látex rasgado de orelha a orelha, maquiagem teatral sinistra e balão vermelho ensanguentado.',
  '["https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T20:30:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 5. Rafael Torres - Espantalho dos Milharais Malditos
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_espantalho_assassino',
  'Rafael Torres',
  'Espantalho dos Milharais Malditos',
  'Mais Assustador',
  'Máscara costurada em estopa rústica e arame farpado, chapéu pontudo desgastado, foice metálica enferrujada e aura aterrorizante.',
  '["https://images.unsplash.com/photo-1572293007244-8b60335d2b7d?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T20:40:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 6. Camila Rocha - La Catrina - Dama de la Muerte
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_catrina_mexicana',
  'Camila Rocha',
  'La Catrina - Dama de la Muerte',
  'Mítico & Sobrenatural',
  'Pintura facial minuciosa de caveira mexicana com pedrarias pretas e douradas, tiara farta de flores de cempasúchil e traje bordado.',
  '["https://images.unsplash.com/photo-1508341591423-4347099e1f19?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1481819613568-3701cbc70156?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T20:50:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 7. Marcos Vinícius - Ceifador da Meia-Noite
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_ceifador_morte',
  'Marcos Vinícius',
  'Ceifador da Meia-Noite (Grim Reaper)',
  'Vilões & Cinema',
  'Manto negro sem rosto com capuz profundo, garras esqueléticas articuladas e foice imponente de lâmina espectral.',
  '["https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T21:00:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 8. Larissa Fernandes - Feiticeira das Sombras
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_feiticeira_sombras',
  'Larissa Fernandes',
  'Feiticeira das Sombras & Teias',
  'Cosplay Sombrio',
  'Corset rendado em teias de aranha com véu gótico de tule negro, tiara de chifres pontiagudos e amuleto luminescente.',
  '["https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T21:10:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 9. Gabriel Duarte - Lobisomem da Lua de Sangue
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_lobisomem_lua',
  'Gabriel Duarte',
  'Lobisomem da Lua de Sangue',
  'Terror Clássico',
  'Pelagem rústica realista, presas caninas afiadas, garras de besta demoníaca e olhos amarelos brilhantes sob a lua cheia.',
  '["https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1572945281869-8269d0d9703f?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T21:20:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 10. Amanda Vasconcelos - Rainha Vampira Carmilla
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_rainha_vampira',
  'Amanda Vasconcelos',
  'Rainha Vampira Carmilla',
  'Terror Clássico',
  'Vestido imperial de veludo bordô com detalhes em ouro envelhecido, coroa gótica de espinhos e taça de sangue das trevas.',
  '["https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T21:30:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 11. Thiago Alvarenga - Médico da Peste Negra
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_medico_peste',
  'Thiago Alvarenga',
  'Médico da Peste Negra (Plague Doctor)',
  'Vilões & Cinema',
  'Máscara alongada de bico de pássaro em couro envelhecido, sobretudo encerado, cartola alta e bastão com lanterna verde espectral.',
  '["https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T21:40:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 12. Fernanda Siqueira - Zumbi Biohazard do Apocalipse
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_zumbi_biohazard',
  'Fernanda Siqueira',
  'Zumbi Biohazard do Apocalipse',
  'Mais Assustador',
  'Macacão de contenção química rasgado, próteses de infecção necrosada hiper-realistas e lentes de contato esbranquiçadas sinistras.',
  '["https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1572293007244-8b60335d2b7d?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T21:50:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 13. Rodrigo Lima - O Mascarado Sombrio (Slasher)
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_mascarado_slasher',
  'Rodrigo Lima',
  'O Mascarado Sombrio (Slasher)',
  'Vilões & Cinema',
  'Macacão mecânico manchado de fuligem, máscara facial sinistra com marcas de combate e machado rústico estilizado.',
  '["https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1603792907191-89e55f70071a?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T22:00:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- 14. Mariana Couto - Fada Sombria dos Pântanos
INSERT INTO public.candidates (id, name, costume_name, category, description, photos, votes, created_at)
VALUES (
  'cand_fada_sombria',
  'Mariana Couto',
  'Fada Sombria dos Pântanos',
  'Mítico & Sobrenatural',
  'Asas de inseto translúcidas e esfarrapadas em tons de ébano, coroa de galhos secos, maquiagem fosforescente e orquídeas negras.',
  '["https://images.unsplash.com/photo-1508341591423-4347099e1f19?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  0,
  '2026-10-31T22:10:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  costume_name = EXCLUDED.costume_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos;

-- Confirmar inserção total das 14 fantasias
SELECT count(*) as total_fantasias FROM public.candidates;
SELECT id, name, costume_name, category, votes FROM public.candidates ORDER BY created_at ASC;
