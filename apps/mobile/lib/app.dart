import "package:flutter/material.dart";
import "package:foodfox/screens/chat_screen.dart";
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
  int _tab = 0;
  int _resultsReload = 0;

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  void _onUploaded() {
    setState(() {
      _resultsReload++;
      _tab = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      UploadScreen(api: _api, onUploaded: _onUploaded),
      ResultsScreen(api: _api, reloadToken: _resultsReload),
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
              label: "Результаты",
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
