import "package:flutter/material.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/version.dart";
import "package:foodfox/widgets/fox_logo.dart";

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.api, required this.onLoggedIn});

  final FoodFoxApi api;
  final VoidCallback onLoggedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  var _register = false;
  var _loading = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_register) {
        await widget.api.register(
          _email.text.trim(),
          _password.text,
          _name.text.trim(),
        );
      } else {
        await widget.api.login(_email.text.trim(), _password.text);
      }
      widget.onLoggedIn();
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FoxColors.bg,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 24),
                      const Center(child: FoxLogo(size: 56)),
                      const SizedBox(height: 12),
                      Text(
                        "FoodFox",
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: FoxColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Личный кабинет после теста FOX",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: FoxColors.muted),
                      ),
                      const SizedBox(height: 28),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton(
                              onPressed: _loading ? null : () => setState(() => _register = false),
                              style: FilledButton.styleFrom(
                                backgroundColor: !_register ? FoxColors.primary : FoxColors.surface,
                                foregroundColor: !_register ? Colors.white : FoxColors.muted,
                              ),
                              child: const Text("Вход"),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton(
                              onPressed: _loading ? null : () => setState(() => _register = true),
                              style: FilledButton.styleFrom(
                                backgroundColor: _register ? FoxColors.primary : FoxColors.surface,
                                foregroundColor: _register ? Colors.white : FoxColors.muted,
                              ),
                              child: const Text("Регистрация"),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      if (_register)
                        TextField(
                          controller: _name,
                          decoration: const InputDecoration(labelText: "Имя"),
                        ),
                      if (_register) const SizedBox(height: 12),
                      TextField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(labelText: "Email"),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _password,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: "Пароль"),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!, style: const TextStyle(color: FoxColors.red)),
                      ],
                      const Spacer(),
                      FilledButton(
                        onPressed: _loading ? null : _submit,
                        style: FilledButton.styleFrom(
                          backgroundColor: FoxColors.primary,
                          minimumSize: const Size.fromHeight(48),
                        ),
                        child: Text(_loading ? "Подождите…" : (_register ? "Создать аккаунт" : "Войти")),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        "v$kAppVersionLabel",
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: FoxColors.muted),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
