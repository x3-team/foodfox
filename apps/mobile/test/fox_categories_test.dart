import "dart:convert";
import "dart:io";

import "package:flutter_test/flutter_test.dart";
import "package:foodfox/data/fox_categories.dart";

void main() {
  test("every catalog antigen belongs to exactly one category", () {
    final catalog = jsonDecode(
      File("../../packages/database/seeds/fox-catalog-ru.json")
          .readAsStringSync(),
    ) as Map<String, dynamic>;
    final names = (catalog["names"] as List).cast<String>();

    expect(foxCategoryByName.keys.toSet(), names.toSet());
    expect(foxCategoryByName.length, names.length);
    expect(foxCategoryByName.values.toSet(), foxCategoryOrder.toSet());
    expect(foxCategoryOf("Лосось"), "Рыба и морепродукты");
    expect(foxCategoryOf("Молоко коровье Bos d 8 *"), "Молекулярный антиген");
    expect(foxCategoryOf("нет такого"), "Прочее");
  });
}
