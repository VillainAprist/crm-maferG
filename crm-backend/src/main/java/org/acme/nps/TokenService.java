package org.acme.nps;

import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@ApplicationScoped
public class TokenService {

    private static final String SECRET = "secreto-super-seguro-maferg-123456-CRM-PROYECTO-HMAC-SHA256";

    public String generarToken(String username, String role, String nombres) {
        try {
            String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
            long exp = (System.currentTimeMillis() / 1000) + 3600; // 1 hora
            String payload = String.format(
                "{\"iss\":\"maferg-crm\",\"sub\":\"%s\",\"role\":\"%s\",\"nombres\":\"%s\",\"exp\":%d}",
                username, role, nombres, exp
            );

            String headerB64 = base64UrlEncode(header.getBytes(StandardCharsets.UTF_8));
            String payloadB64 = base64UrlEncode(payload.getBytes(StandardCharsets.UTF_8));
            
            String unsignedToken = headerB64 + "." + payloadB64;
            String signature = hmacSha256(unsignedToken, SECRET);
            
            return unsignedToken + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Error al generar token", e);
        }
    }

    public DecodedToken verificarToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw new RuntimeException("Formato de token inválido");
            }

            String unsignedToken = parts[0] + "." + parts[1];
            String expectedSignature = hmacSha256(unsignedToken, SECRET);
            
            if (!MessageDigest.isEqual(parts[2].getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
                throw new RuntimeException("Firma del token inválida");
            }

            // Decodificar payload
            String payloadJson = new String(base64UrlDecode(parts[1]), StandardCharsets.UTF_8);
            
            // Parsear claims básicos
            String subject = extractClaim(payloadJson, "sub");
            String role = extractClaim(payloadJson, "role");
            String nombres = extractClaim(payloadJson, "nombres");
            long exp = Long.parseLong(extractClaim(payloadJson, "exp"));

            if (exp < (System.currentTimeMillis() / 1000)) {
                throw new RuntimeException("El token ha expirado");
            }

            return new DecodedToken(subject, role, nombres);
        } catch (Exception e) {
            throw new RuntimeException("Token inválido: " + e.getMessage(), e);
        }
    }

    private String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private byte[] base64UrlDecode(String str) {
        return Base64.getUrlDecoder().decode(str);
    }

    private String hmacSha256(String data, String key) throws Exception {
        byte[] byteKey = key.getBytes(StandardCharsets.UTF_8);
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(byteKey, "HmacSHA256");
        sha256_HMAC.init(keySpec);
        byte[] macData = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return base64UrlEncode(macData);
    }

    private String extractClaim(String json, String claimName) {
        String keyPattern = "\"" + claimName + "\":\"";
        int startIdx = json.indexOf(keyPattern);
        if (startIdx != -1) {
            startIdx += keyPattern.length();
            int endIdx = json.indexOf("\"", startIdx);
            return json.substring(startIdx, endIdx);
        }
        String numPattern = "\"" + claimName + "\":";
        startIdx = json.indexOf(numPattern);
        if (startIdx != -1) {
            startIdx += numPattern.length();
            int endIdx = json.indexOf(",", startIdx);
            if (endIdx == -1) {
                endIdx = json.indexOf("}", startIdx);
            }
            return json.substring(startIdx, endIdx).trim();
        }
        throw new RuntimeException("Claim no encontrado: " + claimName);
    }

    public static class DecodedToken {
        private final String subject;
        private final String role;
        private final String nombres;

        public DecodedToken(String subject, String role, String nombres) {
            this.subject = subject;
            this.role = role;
            this.nombres = nombres;
        }

        public String getSubject() { return subject; }
        public String getRole() { return role; }
        public String getNombres() { return nombres; }
    }
}
