class ApiCacheEntry<T> {
  ApiCacheEntry(this.data, {Duration ttl = const Duration(minutes: 5)})
      : expiresAt = DateTime.now().add(ttl);

  final T data;
  final DateTime expiresAt;

  bool get valid => DateTime.now().isBefore(expiresAt);
}

class ApiCache {
  final _store = <String, ApiCacheEntry<dynamic>>{};

  T? get<T>(String key) {
    final entry = _store[key];
    if (entry == null || !entry.valid) {
      _store.remove(key);
      return null;
    }
    return entry.data as T;
  }

  void set<T>(String key, T data, {Duration ttl = const Duration(minutes: 5)}) {
    _store[key] = ApiCacheEntry(data, ttl: ttl);
  }

  void remove(String key) => _store.remove(key);

  void clear() => _store.clear();
}
