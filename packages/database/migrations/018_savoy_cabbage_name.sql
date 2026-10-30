-- «Cавойская капуста» was written with a Latin C (the lab PDF types it that way), so the admin catalog sorted it
-- before «А» and a correctly spelled report would add a second product. The parser now fixes such letters
-- (fixMixedScript in apps/web/src/lib/fox-parser.ts); this renames the stored row once. If the Cyrillic row already
-- exists, results and recipes move to it and the Latin row goes. Safe to run on every start: afterwards nothing matches.
DO $$
DECLARE
  latin UUID;
  cyr UUID;
BEGIN
  IF to_regclass('food_items') IS NULL THEN RETURN; END IF;
  SELECT id INTO latin FROM food_items WHERE fox_name = U&'\0043авойская капуста' LIMIT 1;
  IF latin IS NULL THEN RETURN; END IF;
  SELECT id INTO cyr FROM food_items WHERE fox_name = 'Савойская капуста' LIMIT 1;
  IF cyr IS NULL THEN
    UPDATE food_items SET fox_name = 'Савойская капуста' WHERE id = latin;
    RETURN;
  END IF;
  -- A report or recipe that has both rows keeps the Cyrillic one.
  DELETE FROM test_results t WHERE t.food_item_id = latin
    AND EXISTS (SELECT 1 FROM test_results c WHERE c.report_id = t.report_id AND c.food_item_id = cyr);
  UPDATE test_results SET food_item_id = cyr WHERE food_item_id = latin;
  IF to_regclass('recipe_ingredients') IS NOT NULL THEN
    DELETE FROM recipe_ingredients r WHERE r.food_item_id = latin
      AND EXISTS (SELECT 1 FROM recipe_ingredients c WHERE c.recipe_id = r.recipe_id AND c.food_item_id = cyr);
    UPDATE recipe_ingredients SET food_item_id = cyr WHERE food_item_id = latin;
  END IF;
  DELETE FROM food_items WHERE id = latin;
END $$;
