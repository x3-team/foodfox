typedef TabLoadCallback = Future<void> Function();

/// Loads data only when a bottom tab becomes active (avoids 4 parallel API calls on login).
class LazyTabLoader {
  LazyTabLoader({required this.onLoad});

  final TabLoadCallback onLoad;
  var _loaded = false;
  var _lastReloadToken = 0;

  void sync({
    required bool active,
    int reloadToken = 0,
    bool force = false,
  }) {
    if (!active) return;
    final shouldLoad = force || reloadToken != _lastReloadToken || !_loaded;
    if (!shouldLoad) return;
    _loaded = true;
    _lastReloadToken = reloadToken;
    onLoad();
  }
}
