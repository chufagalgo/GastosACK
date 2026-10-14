-- Dirección de la oficina de ACK Logic como origen por defecto de los km.
alter table public.profiles
  alter column origin_address set default 'Carrer dels Argenters, 2, 08290 Cerdanyola del Vallès';

update public.profiles set origin_address = 'Carrer dels Argenters, 2, 08290 Cerdanyola del Vallès'
where origin_address = '';
