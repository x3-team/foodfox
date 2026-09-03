String formatNetworkError(Object error) {
  final text = error.toString();
  if (text.contains("SocketException") ||
      text.contains("ClientException") ||
      text.contains("Connection") ||
      text.contains("connection abort")) {
    return "Нет связи с сервером. Проверьте интернет или VPN и нажмите «Повторить».";
  }
  return text.replaceFirst("Exception: ", "");
}
