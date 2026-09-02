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
      _tab = 1;
    });
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

    final screens = [
      UploadScreen(api: _api, onUploaded: _onUploaded),
      ResultsScreen(api: _api, reloadToken: _resultsReload),
      PlanScreen(api: _api),
      RecipesScreen(api: _api),
      ChatScreen(api: _api),
    ];

    return MaterialApp(
      title: "FoodFox",
      debugShowCheckedModeBanner: false,
      theme: buildFoxTheme(),
      home: Scaffold(
        backgroundColor: FoxColors.bg,
        body: SafeArea(
          bottom: false,
          child: IndexedStack(index: _tab, children: screens),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
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
