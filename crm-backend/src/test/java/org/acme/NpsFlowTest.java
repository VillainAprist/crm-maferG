package org.acme;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import io.agroal.api.AgroalDataSource;
import jakarta.inject.Inject;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class NpsFlowTest {

    @Inject
    AgroalDataSource dataSource;

    private static String tokenQr;
    private static String lastAlertaId;
    private static String lastCuponCodigo;
    private static String adminToken;

    @Test
    @Order(1)
    void testLogin() {
        adminToken = given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "username", "admin",
                "password", "admin123"
            ))
            .when().post("/api/auth/login")
            .then()
            .statusCode(200)
            .body("token", notNullValue())
            .extract().path("token");

        System.out.println("Obtained admin JWT Token: " + adminToken);
    }

    @Test
    @Order(2)
    void testGetDemoToken() {
        tokenQr = given()
            .when().get("/api/nps/public/demo-token")
            .then()
            .statusCode(200)
            .body("token_qr", notNullValue())
            .extract().path("token_qr");

        System.out.println("Using Token QR for test: " + tokenQr);
    }

    @Test
    @Order(3)
    void testSubmitPromoterSurvey() {
        String uniqueEmail = "promotor." + System.currentTimeMillis() + "@maferg.com";
        String uniquePhone = "999" + (System.currentTimeMillis() % 1000000);
        // Promoter score = 10
        var response = given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "tokenQr", tokenQr,
                "puntuacion", 10,
                "comentario", "Excelente tela y atencion",
                "email", uniqueEmail,
                "telefono", uniquePhone,
                "nombre", "Juan Promotor",
                "ciudad", "Lima",
                "mayorista", true
            ))
            .when().post("/api/nps/public/ingesta")
            .then()
            .statusCode(200)
            .body("clasificacion", is("PROMOTOR"))
            .extract();

        Boolean cuponCreado = response.path("cuponCreado");
        if (cuponCreado != null && cuponCreado) {
            lastCuponCodigo = response.path("codigoCupon");
            System.out.println("Generated Coupon: " + lastCuponCodigo);
        } else {
            System.out.println("No coupon generated (flaky probability roll or existing client evaluations)");
        }
    }

    @Test
    @Order(4)
    void testSubmitDetractorSurvey() {
        String uniqueEmail = "detractor." + System.currentTimeMillis() + "@maferg.com";
        String uniquePhone = "998" + (System.currentTimeMillis() % 1000000);
        // Detractor score = 3
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "tokenQr", tokenQr,
                "puntuacion", 3,
                "comentario", "Prenda rota al recibir",
                "email", uniqueEmail,
                "telefono", uniquePhone,
                "nombre", "Maria Detractora",
                "ciudad", "Arequipa",
                "mayorista", false
            ))
            .when().post("/api/nps/public/ingesta")
            .then()
            .statusCode(200)
            .body("clasificacion", is("DETRACTOR"))
            .body("alertaCreada", is(true));
    }

    @Test
    @Order(5)
    void testAdminResumenMetrics() {
        given()
            .header("Authorization", "Bearer " + adminToken)
            .when().get("/api/nps/admin/resumen")
            .then()
            .statusCode(200)
            .body("respuestasHoy", greaterThanOrEqualTo(2))
            .body("detractores", greaterThanOrEqualTo(1))
            .body("promotores", greaterThanOrEqualTo(1))
            .body("alertasPendientes", greaterThanOrEqualTo(1))
            .body("totalEncuestas", greaterThanOrEqualTo(2));
    }

    @Test
    @Order(6)
    void testAdminAlertsAndResolve() {
        // Fetch alerts to find the one we just generated
        var response = given()
            .header("Authorization", "Bearer " + adminToken)
            .when().get("/api/nps/admin/alertas")
            .then()
            .statusCode(200)
            .body("size()", greaterThanOrEqualTo(1))
            .extract();

        lastAlertaId = response.path("[0].id"); // The latest alert (since ordered DESC)
        System.out.println("Resolving alert: " + lastAlertaId);

        // Resolve the alert
        given()
            .header("Authorization", "Bearer " + adminToken)
            .contentType(ContentType.JSON)
            .body(Map.of("comentario", "Solucionado con reembolso y cambio de prenda."))
            .when().post("/api/nps/admin/alertas/" + lastAlertaId + "/resolver")
            .then()
            .statusCode(200)
            .body("mensaje", is("Alerta resuelta exitosamente."));

        // Verify it is resolved
        given()
            .header("Authorization", "Bearer " + adminToken)
            .when().get("/api/nps/admin/alertas")
            .then()
            .statusCode(200)
            .body("[0].estado", is("RESUELTA"));
    }

    @Test
    @Order(7)
    void testAdminCoupons() {
        given()
            .header("Authorization", "Bearer " + adminToken)
            .when().get("/api/nps/admin/cupones")
            .then()
            .statusCode(200)
            .body("size()", greaterThanOrEqualTo(1))
            .body("[0].codigo", notNullValue());
    }

    @Test
    @Order(8)
    void testSubmitAnonymousSurvey() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "tokenQr", tokenQr,
                "puntuacion", 9,
                "comentario", "Encuesta anonima de prueba",
                "email", "",
                "telefono", "",
                "nombre", "",
                "ciudad", "Tacna",
                "mayorista", false
            ))
            .when().post("/api/nps/public/ingesta")
            .then()
            .statusCode(200)
            .body("clasificacion", is("PROMOTOR"))
            .body("cuponCreado", is(false))
            .body("codigoCupon", nullValue());
    }

    @Test
    @Order(9)
    void testGetLoteResumen() {
        // Test con token válido
        given()
            .when().get("/api/nps/public/lote/" + tokenQr)
            .then()
            .statusCode(200)
            .body("codigoLote", is("LOTE-2026-024"))
            .body("nombrePrenda", is("Conjunto Infantil Rayas"))
            .body("sku", is("SKU-SET-001"))
            .body("yaRespondido", notNullValue())
            .body("cantidad", notNullValue());

        // Test con token inválido
        given()
            .when().get("/api/nps/public/lote/00000000-0000-0000-0000-000000000000")
            .then()
            .statusCode(404)
            .body("error", notNullValue());
    }

    @Test
    @Order(10)
    void testCleanUpTestData() throws Exception {
        try (java.sql.Connection conn = dataSource.getConnection();
             java.sql.Statement stmt = conn.createStatement()) {
            
            // 1. Delete child references from alerta_calidad
            stmt.execute("DELETE FROM alerta_calidad WHERE id_evaluacion IN (" +
                         "    SELECT id_evaluacion FROM evaluacion_nps WHERE comentario_calidad IN (" +
                         "        'Excelente tela y atencion', " +
                         "        'Prenda rota al recibir', " +
                         "        'Encuesta anonima de prueba'" +
                         "    )" +
                         ")");
            
            // 2. Delete child references from cupon_fidelizacion
            stmt.execute("DELETE FROM cupon_fidelizacion WHERE id_evaluacion IN (" +
                         "    SELECT id_evaluacion FROM evaluacion_nps WHERE comentario_calidad IN (" +
                         "        'Excelente tela y atencion', " +
                         "        'Prenda rota al recibir', " +
                         "        'Encuesta anonima de prueba'" +
                         "    )" +
                         ")");
            
            // 4. Delete parent rows from evaluacion_nps
            stmt.execute("DELETE FROM evaluacion_nps WHERE comentario_calidad IN (" +
                         "    'Excelente tela y atencion', " +
                         "    'Prenda rota al recibir', " +
                         "    'Encuesta anonima de prueba'" +
                         ")");
            
            System.out.println("Test data and child constraints cleaned up successfully from the database.");
        }
    }
}
