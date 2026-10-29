import "dart:async";

import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "package:foodfox/screens/auth/auth_flow.dart";
import "package:foodfox/screens/chat_screen.dart";
import "package:foodfox/screens/diary_screen.dart";
import "package:foodfox/screens/plan_screen.dart";
import "package:foodfox/screens/profile_screen.dart";
import "package:foodfox/screens/recipes_screen.dart";
import "package:foodfox/screens/results_screen.dart";
import "package:foodfox/screens/splash_screen.dart";
import "package:foodfox/screens/upload_screen.dart";
import "package:foodfox/services/auth_store.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/services/telemetry.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_icons.dart";
import "package:foodfox/widgets/ui/fox_keyboard.dart";
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
  final _unfocusOnNavigate = FoxUnfocusOnNavigate();

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
      // Only a demo session that got as far as a PIN is worth restoring. A
      // leftover flag must not switch the bundled data on for whoever signs
      // in next.
      if (await _store.isDemoSession && await _store.hasPin) {
        try {
          await _api.startDemoSession().timeout(const Duration(seconds: 3));
          Telemetry.setDemo(true);
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
      Telemetry.setDemo(false);
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
    Telemetry.event(FoxEvent.signedOut);
    Telemetry.setDemo(false);
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
      navigatorObservers: [_unfocusOnNavigate, TelemetryRouteObserver()],
      builder: (context, child) =>
          FoxKeyboardDismiss(child: child ?? const SizedBox.shrink()),
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

  static const _tabScreens = ["results", "plan", "chat", "recipes", "profile"];

  @override
  void initState() {
    super.initState();
    Telemetry.screen(_tabScreens[_tab]);
  }

  /// Analytics for a tab that just came to the front.
  void _reportTab(int index, {String from = "tab"}) {
    Telemetry.screen(_tabScreens[index]);
    if (index == 1) Telemetry.event(FoxEvent.planViewed, {"from": from});
    if (index == 2) Telemetry.event(FoxEvent.chatOpened, {"from": from});
  }

  void _select(int index) {
    // Tabs stay mounted offstage, and so would a focused field on them,
    // keeping the keyboard up over the next tab.
    foxDismissKeyboard();
    if (index != _tab) _reportTab(index);
    setState(() {
      _tab = index;
      _visited.add(index);
    });
  }

  void _onUploaded() {
    foxDismissKeyboard();
    Telemetry.screen(_tabScreens[0]);
    setState(() {
      _resultsReload++;
      // The plan and the assistant only exist once a report does, so their
      // empty states are thrown away along with the cached data.
      _chatSeed++;
      _visited.add(0);
      _tab = 0;
    });
  }

  void _askBot(String question, {String from = "results"}) {
    foxDismissKeyboard();
    Telemetry.event(FoxEvent.askAssistant, {"from": from});
    if (_tab != 2) _reportTab(2, from: from);
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
                  onUpload: () => _openUpload(from: "results"),
                ),
              ),
              _layer(
                1,
                PlanScreen(
                  key: ValueKey("plan-$_resultsReload"),
                  api: widget.api,
                  onUpload: () => _openUpload(from: "plan"),
                  onAsk: (question) => _askBot(question, from: "plan"),
                ),
              ),
              _layer(
                2,
                ChatScreen(
                  key: ValueKey("chat-$_chatSeed"),
                  api: widget.api,
                  initialMessage: _chatPrompt,
                  onOpenDiary: () => _openDiary(from: "chat"),
                ),
              ),
              _layer(
                3,
                RecipesScreen(
                  key: ValueKey("recipes-$_resultsReload"),
                  api: widget.api,
                ),
              ),
              _layer(
                4,
                ProfileScreen(
                  key: const ValueKey("profile"),
                  api: widget.api,
                  store: widget.store,
                  onSignOut: widget.onSignOut,
                  onUploadReport: () => _openUpload(from: "profile"),
                  onOpenDiary: () => _openDiary(from: "profile"),
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

  Future<void> _openDiary({required String from}) {
    foxDismissKeyboard();
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: "diary"),
        builder: (_) => DiaryScreen(api: widget.api, from: from),
      ),
    );
  }

  Future<void> _openUpload({required String from}) async {
    Telemetry.event(FoxEvent.uploadOpened, {"from": from});
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: "upload"),
        builder: (_) => UploadScreen(
          api: widget.api,
          onUploaded: () {
            // Upload and processing sit on top of the shell.
            Navigator.of(context).popUntil((route) => route.isFirst);
            _onUploaded();
          },
          onSupport: (question) {
            Navigator.of(context).popUntil((route) => route.isFirst);
            _askBot(question, from: "upload_support");
          },
        ),
      ),
    );
  }
}
