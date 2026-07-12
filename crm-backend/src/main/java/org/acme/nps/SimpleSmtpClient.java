package org.acme.nps;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class SimpleSmtpClient {

    public static void sendEmail(String host, int port, String username, String password, boolean startTls,
                                 String from, String to, String subject, String htmlContent) throws Exception {
        
        Socket socket = new Socket(host, port);
        BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

        try {
            // Welcome banner
            readResponse(reader, "220");

            // EHLO
            sendLine(writer, "EHLO localhost");
            readResponse(reader, "250");

            if (startTls) {
                // STARTTLS
                sendLine(writer, "STARTTLS");
                readResponse(reader, "220");

                // Upgrade socket to SSL/TLS
                SSLSocketFactory sslSocketFactory = (SSLSocketFactory) SSLSocketFactory.getDefault();
                SSLSocket sslSocket = (SSLSocket) sslSocketFactory.createSocket(socket, host, port, true);
                sslSocket.startHandshake();

                // Re-bind reader and writer
                reader = new BufferedReader(new InputStreamReader(sslSocket.getInputStream(), StandardCharsets.UTF_8));
                writer = new BufferedWriter(new OutputStreamWriter(sslSocket.getOutputStream(), StandardCharsets.UTF_8));

                // EHLO again
                sendLine(writer, "EHLO localhost");
                readResponse(reader, "250");
            }

            // Auth Login
            if (username != null && !username.isEmpty() && password != null && !password.isEmpty()) {
                sendLine(writer, "AUTH LOGIN");
                readResponse(reader, "334");

                String userBase64 = Base64.getEncoder().encodeToString(username.getBytes(StandardCharsets.UTF_8));
                sendLine(writer, userBase64);
                readResponse(reader, "334");

                String passBase64 = Base64.getEncoder().encodeToString(password.getBytes(StandardCharsets.UTF_8));
                sendLine(writer, passBase64);
                readResponse(reader, "235");
            }

            // MAIL FROM
            sendLine(writer, "MAIL FROM:<" + from + ">");
            readResponse(reader, "250");

            // RCPT TO
            sendLine(writer, "RCPT TO:<" + to + ">");
            readResponse(reader, "250");

            // DATA
            sendLine(writer, "DATA");
            readResponse(reader, "354");

            // Email Headers & Body
            writer.write("From: " + from + "\r\n");
            writer.write("To: " + to + "\r\n");
            writer.write("Subject: " + subject + "\r\n");
            writer.write("MIME-Version: 1.0\r\n");
            writer.write("Content-Type: text/html; charset=UTF-8\r\n");
            writer.write("\r\n");
            writer.write(htmlContent);
            writer.write("\r\n.\r\n");
            writer.flush();
            readResponse(reader, "250");

            // QUIT
            sendLine(writer, "QUIT");
        } finally {
            try {
                socket.close();
            } catch (IOException e) {
                // Ignore close exceptions
            }
        }
    }

    private static void sendLine(BufferedWriter writer, String line) throws IOException {
        writer.write(line + "\r\n");
        writer.flush();
    }

    private static void readResponse(BufferedReader reader, String expectedCode) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.length() < 3) {
                throw new IOException("Invalid SMTP response: " + line);
            }
            if (line.charAt(3) == ' ') {
                if (!line.startsWith(expectedCode)) {
                    throw new IOException("SMTP error: expected " + expectedCode + ", got: " + line);
                }
                break;
            } else if (line.charAt(3) != '-') {
                throw new IOException("Invalid SMTP response: " + line);
            }
        }
    }
}
