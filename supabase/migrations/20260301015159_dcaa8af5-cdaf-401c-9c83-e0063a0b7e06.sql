-- Allow deleting all categories (remove is_default restriction)
DROP POLICY "Anyone can delete categories" ON public.categories;
CREATE POLICY "Anyone can delete categories"
  ON public.categories
  FOR DELETE
  USING (true);