String formatNetworkError(Object error) {
  final text = error.toString();
  if (text.contains("SocketException") ||
      text.contains("ClientException") ||
      text.contains("TimeoutException") ||
      text.contains("Connection") ||
      text.contains("connection abort")) {
    return "Нет связи с сервером. Проверьте интернет или VPN и нажмите «Повторить».";
  }
  if (text.contains("Server error") || text.contains("Не удалось отправить")) {
    return "Не удалось получить ответ. Потяните чат вниз или отправьте сообщение ещё раз.";
  }
  return text.replaceFirst("Exception: ", "");
}
