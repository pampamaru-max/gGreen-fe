
ALTER TABLE public.indicators
ADD COLUMN description text DEFAULT '',
ADD COLUMN detail text DEFAULT '',
ADD COLUMN scoring_criteria jsonb DEFAULT '[]'::jsonb;
