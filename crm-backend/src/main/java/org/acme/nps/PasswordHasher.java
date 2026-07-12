package org.acme.nps;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

public class PasswordHasher {
    private static final int ITERATIONS = 10000;
    private static final int KEY_LENGTH = 256;

    public static String hashPassword(String password) {
        try {
            SecureRandom random = new SecureRandom();
            byte[] salt = new byte[16];
            random.nextBytes(salt);
            byte[] hash = pbkdf2(password.toCharArray(), salt);
            return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static boolean checkPassword(String password, String storedHash) {
        try {
            if (storedHash == null || !storedHash.contains(":")) {
                // Si la base de datos se inicializó en texto plano antes de la migración
                return password.equals(storedHash);
            }
            String[] parts = storedHash.split(":");
            if (parts.length != 2) return false;
            byte[] salt = Base64.getDecoder().decode(parts[0]);
            byte[] hash = Base64.getDecoder().decode(parts[1]);
            byte[] testHash = pbkdf2(password.toCharArray(), salt);
            
            // Comparación en tiempo constante para mitigar ataques de canal lateral
            int diff = hash.length ^ testHash.length;
            for (int i = 0; i < hash.length && i < testHash.length; i++) {
                diff |= hash[i] ^ testHash[i];
            }
            return diff == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static byte[] pbkdf2(char[] password, byte[] salt) throws NoSuchAlgorithmException, InvalidKeySpecException {
        PBEKeySpec spec = new PBEKeySpec(password, salt, ITERATIONS, KEY_LENGTH);
        SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        return skf.generateSecret(spec).getEncoded();
    }
}
