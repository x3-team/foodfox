import "dart:async";

import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "package:foodfox/screens/auth/auth_flow.dart";
import "package:foodfox/screens/chat_screen.dart";
import "package:foodfox/screens/plan_screen.dart";
import "package:foodfox/screens/profile_screen.dart";
import "package:foodfox/screens/recipes_screen.dart";
import "package:foodfox/screens/results_screen.dart";
import "package:foodfox/screens/splash_screen.dart";
import "package:foodfox/screens/upload_screen.dart";
import "package:foodfox/services/auth_store.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_icons.dart";
import "package:foodfox/widgets/ui/fox_tab_bar.dart";

enum _Stage { splash, unlock, auth, app }

class FoodFoxApp extends StatefulWidget {
  const FoodFoxApp({super.key});

  @override
  State<FoodFoxApp> createState() => _FoodFoxAppState();
}

class _FoodFoxAppState extends State<FoodFoxApp> {
  final _api = FoodFoxApi();
  final _store = AuthStore();

  _Stage _stage = _Stage.splash;
  bool _bootstrapped = false;
  bool _splashFinished = false;
  bool _hasStoredSession = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  /// Restores the local session while the splash animation plays.
  ///
  /// A round trip to the server must not gate this. [fetchMe] retries for
  /// about a minute and a half, and [refreshSession] has no deadline of its
  /// own, so waiting here left the finished splash (logo in the corner, empty
  /// green) on screen for as long as the network stayed quiet.
  Future<void> _bootstrap() async {
    try {
      if (await _store.isDemoSession) {
        try {
          await _api.startDemoSession().timeout(const Duration(seconds: 3));
          _hasStoredSession = await _store.hasPin;
          return;
        } catch (_) {
          // Falls through to the normal path when the build carries no demo data.
        }
      }

      final access = await _store.accessToken;
      final refresh = await _store.refreshToken;
      _api.restoreSession(accessToken: access, refreshToken: refresh);
      final hasPin = await _store.hasPin;
      _hasStoredSession = hasPin && _api.isLoggedIn;
      if (_api.isLoggedIn && !_api.isDemo) unawaited(_warmSession());
    } catch (_) {
      _hasStoredSession = false;
    } finally {
      _bootstrapped = true;
      if (mounted) {
        setState(() {});
        _leaveSplash();
      }
    }
  }

  /// Confirms a saved token after the splash has already moved on.
  Future<void> _warmSession() async {
    try {
      await _api.fetchMe();
    } catch (_) {
      await _api.refreshSession();
    }
  }

  void _onSplashDone() {
    _splashFinished = true;
    if (_bootstrapped) {
      _leaveSplash();
      return;
    }
    // Local storage should already be back. If it never answers, leave the
    // finished frame anyway instead of waiting on it forever.
    Future<void>.delayed(const Duration(seconds: 2), () {
      if (!mounted || _stage != _Stage.splash) return;
      _bootstrapped = true;
      _leaveSplash();
    });
  }

  void _leaveSplash() {
    if (!_splashFinished || !_bootstrapped || !mounted) return;
    if (_stage != _Stage.splash) return;
    setState(() => _stage = _hasStoredSession ? _Stage.unlock : _Stage.auth);
  }

  Future<void> _signOut() async {
    await _store.clear();
    _api.logout();
    if (mounted) setState(() => _stage = _Stage.auth);
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "FoodFox",
      debugShowCheckedModeBanner: false,
      theme: buildFoxTheme(),
      home: AnimatedSwitcher(
        duration: FoxMotion.slow,
        switchInCurve: FoxMotion.easeOut,
        child: _body(),
      ),
    );
  }

  Widget _body() {
    switch (_stage) {
      case _Stage.splash:
        return SplashScreen(
          key: const ValueKey("splash"),
          onFinished: _onSplashDone,
        );

      case _Stage.unlock:
        return UnlockGate(
          key: const ValueKey("unlock"),
          store: _store,
          onUnlocked: () => setState(() => _stage = _Stage.app),
          onForgot: _signOut,
        );

      case _Stage.auth:
        return AuthFlow(
          key: const ValueKey("auth"),
          api: _api,
          store: _store,
          onAuthenticated: () => setState(() => _stage = _Stage.app),
        );

      case _Stage.app:
        return AppShell(
          key: const ValueKey("shell"),
          api: _api,
          store: _store,
          onSignOut: _signOut,
        );
    }
  }
}

/// Tabbed shell: Отчёт · План · Чат · Рецепты · Профиль.
class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    required this.api,
    required this.store,
    required this.onSignOut,
  });

  final FoodFoxApi api;
  final AuthStore store;
  final VoidCallback onSignOut;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _tab = 0;
  int _resultsReload = 0;
  int _chatSeed = 0;
  String? _chatPrompt;
  final _visited = <int>{0};

  void _select(int index) {
    setState(() {
      _tab = index;
      _visited.add(index);
    });
  }

  void _onUploaded() {
    setState(() {
      _resultsReload++;
      _visited.add(0);
      _tab = 0;
    });
  }

  void _askBot(String question) {
    setState(() {
      _chatPrompt = question;
      _chatSeed++;
      _visited.add(2);
      _tab = 2;
    });
  }

  Widget _layer(int index, Widget child) {
    if (!_visited.contains(index)) return const SizedBox.shrink();
    return Offstage(
      offstage: _tab != index,
      child: TickerMode(
        enabled: _tab == index,
        child: RepaintBoundary(child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: foxSystemOverlay,
      child: Scaffold(
        backgroundColor: FoxTokens.bgNeutral,
        body: SafeArea(
          bottom: false,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _layer(
                0,
                ResultsScreen(
                  key: const ValueKey("results"),
                  api: widget.api,
                  reloadToken: _resultsReload,
                  onAskBot: _askBot,
                  onOpenPlan: () => _select(1),
                  onOpenRecipes: () => _select(3),
                  onUpload: () => _select(4),
                ),
              ),
              _layer(
                1,
                PlanScreen(key: const ValueKey("plan"), api: widget.api),
              ),
              _layer(
                2,
                ChatScreen(
                  key: ValueKey("chat-$_chatSeed"),
                  api: widget.api,
                  initialMessage: _chatPrompt,
                ),
              ),
              _layer(
                3,
                RecipesScreen(key: const ValueKey("recipes"), api: widget.api),
              ),
              _layer(
                4,
                ProfileScreen(
                  key: const ValueKey("profile"),
                  api: widget.api,
                  store: widget.store,
                  onSignOut: widget.onSignOut,
                  onUploadReport: () => _openUpload(),
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: FoxTabBar(
          index: _tab,
          onSelect: _select,
          tabs: const [
            FoxTab(kind: FoxIconKind.report, label: "Отчёт"),
            FoxTab(kind: FoxIconKind.plan, label: "План"),
            FoxTab(kind: FoxIconKind.chat, label: "Чат"),
            FoxTab(kind: FoxIconKind.recipes, label: "Рецепты"),
            FoxTab(kind: FoxIconKind.profile, label: "Профиль"),
          ],
        ),
      ),
    );
  }

  Future<void> _openUpload() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => UploadScreen(
          api: widget.api,
          onUploaded: () {
            Navigator.of(context).pop();
            _onUploaded();
          },
        ),
      ),
    );
  }
}
