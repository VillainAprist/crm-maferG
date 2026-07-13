package org.acme.nps;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

public class EmailHttpSender {

    public static void sendEmail(String apiKey, String senderName, String senderEmail, String toEmail, String subject, String htmlContent) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        String escapedHtml = escapeJson(htmlContent);
        String escapedSubject = escapeJson(subject);
        String escapedSenderName = escapeJson(senderName);
        
        String jsonPayload = "{" +
                "  \"sender\": {\"name\": \"" + escapedSenderName + "\", \"email\": \"" + senderEmail + "\"}," +
                "  \"to\": [{\"email\": \"" + toEmail + "\"}]," +
                "  \"subject\": \"" + escapedSubject + "\"," +
                "  \"htmlContent\": \"" + escapedHtml + "\"" +
                "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("api-key", apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            System.out.println("Email sent successfully via Brevo HTTP API. Status: " + response.statusCode());
        } else {
            throw new Exception("Failed to send email via Brevo HTTP API. Status: " + response.statusCode() + ", Response: " + response.body());
        }
    }

    private static String escapeJson(String input) {
        if (input == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < input.length(); i++) {
            char ch = input.charAt(i);
            switch (ch) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\b':
                    sb.append("\\b");
                    break;
                case '\f':
                    sb.append("\\f");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    if (ch < ' ') {
                        String t = "000" + Integer.toHexString(ch);
                        sb.append("\\u" + t.substring(t.length() - 4));
                    } else {
                        sb.append(ch);
                    }
            }
        }
        return sb.toString();
    }
}
