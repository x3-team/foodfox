import "package:flutter/material.dart";
import "package:foodfox/screens/chat_screen.dart";
import "package:foodfox/screens/login_screen.dart";
import "package:foodfox/screens/plan_screen.dart";
import "package:foodfox/screens/recipes_screen.dart";
import "package:foodfox/screens/results_screen.dart";
import "package:foodfox/screens/upload_screen.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";

class FoodFoxApp extends StatefulWidget {
  const FoodFoxApp({super.key});

  @override
  State<FoodFoxApp> createState() => _FoodFoxAppState();
}

class _FoodFoxAppState extends State<FoodFoxApp> {
  final _api = FoodFoxApi();
  var _loggedIn = false;
  var _checkingAuth = true;
  int _tab = 0;
  int _resultsReload = 0;
  String? _chatInitialMessage;
  int _chatSeed = 0;
  final _visitedTabs = <int>{0};

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    if (!_api.isLoggedIn) {
      setState(() {
        _checkingAuth = false;
        _loggedIn = false;
      });
      return;
    }
    try {
      await _api.fetchMe();
      setState(() {
        _loggedIn = true;
        _checkingAuth = false;
      });
    } catch (_) {
      _api.logout();
      setState(() {
        _loggedIn = false;
        _checkingAuth = false;
      });
    }
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  void _onLoggedIn() => setState(() => _loggedIn = true);

  void _onUploaded() {
    setState(() {
      _resultsReload++;
      _visitedTabs.add(1);
      _tab = 1;
    });
  }

  void _askBot(String question) {
    setState(() {
      _chatInitialMessage = question;
      _chatSeed++;
      _visitedTabs.add(4);
      _tab = 4;
    });
  }

  void _openPlanTab() {
    setState(() {
      _visitedTabs.add(2);
      _tab = 2;
    });
  }

  void _selectTab(int index) {
    setState(() {
      _tab = index;
      _visitedTabs.add(index);
    });
  }

  Widget _tabLayer(int index, Widget child) {
    if (!_visitedTabs.contains(index)) return const SizedBox.shrink();
    return Offstage(
      offstage: _tab != index,
      child: RepaintBoundary(child: child),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_checkingAuth) {
      return MaterialApp(
        home: Scaffold(
          backgroundColor: FoxColors.bg,
          body: const Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (!_loggedIn) {
      return MaterialApp(
        title: "FoodFox",
        debugShowCheckedModeBanner: false,
        theme: buildFoxTheme(),
        home: LoginScreen(api: _api, onLoggedIn: _onLoggedIn),
      );
    }

    return MaterialApp(
      title: "FoodFox",
      debugShowCheckedModeBanner: false,
      theme: buildFoxTheme(),
      home: Scaffold(
        backgroundColor: FoxColors.bg,
        body: SafeArea(
          bottom: false,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _tabLayer(
                0,
                UploadScreen(api: _api, onUploaded: _onUploaded),
              ),
              _tabLayer(
                1,
                ResultsScreen(
                  key: const ValueKey("results"),
                  api: _api,
                  reloadToken: _resultsReload,
                  onAskBot: _askBot,
                  onOpenPlan: _openPlanTab,
                ),
              ),
              _tabLayer(
                2,
                PlanScreen(key: const ValueKey("plan"), api: _api),
              ),
              _tabLayer(
                3,
                RecipesScreen(key: const ValueKey("recipes"), api: _api),
              ),
              _tabLayer(
                4,
                ChatScreen(
                  key: ValueKey("chat-$_chatSeed"),
                  api: _api,
                  initialMessage: _chatInitialMessage,
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: _selectTab,
          backgroundColor: FoxColors.surface,
          indicatorColor: FoxColors.primarySoft,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.upload_file_outlined),
              selectedIcon: Icon(Icons.upload_file),
              label: "Отчёт",
            ),
            NavigationDestination(
              icon: Icon(Icons.bar_chart_outlined),
              selectedIcon: Icon(Icons.bar_chart),
              label: "Итоги",
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month),
              label: "План",
            ),
            NavigationDestination(
              icon: Icon(Icons.restaurant_menu_outlined),
              selectedIcon: Icon(Icons.restaurant_menu),
              label: "Рецепты",
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              selectedIcon: Icon(Icons.chat_bubble),
              label: "Чат",
            ),
          ],
        ),
      ),
    );
  }
}
