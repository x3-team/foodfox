import "package:flutter_test/flutter_test.dart";
import "package:foodfox/services/telemetry.dart";

void main() {
  test("event parameters keep only safe values", () {
    final clean = Telemetry.cleanParams({
      "parsed_count": 285,
      "demo": true,
      "reason": "network",
      "phone": "79251234567",
      "email": "a@b.ru",
      "text": "Сколько молока можно пить в первую неделю протокола?",
      "empty": "",
      "missing": null,
    });
    expect(clean, {"parsed_count": 285, "demo": true, "reason": "network"});
  });

  test("without a key nothing is sent and nothing throws", () {
    expect(Telemetry.enabled, isFalse);
    Telemetry.event(FoxEvent.uploadOpened, {"from": "results"});
    Telemetry.screen("results");
    Telemetry.error(StateError("x"), StackTrace.current);
    Telemetry.apiFailure(method: "GET", path: "/api/results", status: 500);
  });

  test("file sizes leave only as buckets", () {
    expect(sizeBucket(300 * 1024), "<1MB");
    expect(sizeBucket(3 * 1024 * 1024), "1-5MB");
    expect(sizeBucket(19 * 1024 * 1024), ">10MB");
  });
}
