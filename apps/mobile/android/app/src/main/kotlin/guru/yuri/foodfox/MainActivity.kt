package guru.yuri.foodfox

import io.flutter.embedding.android.FlutterFragmentActivity

// local_auth needs a FragmentActivity host to show the biometric prompt;
// plain FlutterActivity fails at runtime with `no_fragment_activity`.
class MainActivity : FlutterFragmentActivity()
