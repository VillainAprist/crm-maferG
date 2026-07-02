package org.acme.nps;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Map;

import io.agroal.api.AgroalDataSource;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/nps/public")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class NpsPublicResource {

    @Inject
    NpsPublicService npsPublicService;

    @Inject
    AgroalDataSource dataSource;

    @GET
    @Path("/demo-token")
    public Map<String, String> demoToken() {
        return Map.of("token_qr", npsPublicService.obtenerTokenDemo());
    }

    @GET
    @Path("/db-status")
    public Response dbStatus() {
        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery("SELECT current_database()")) {

            resultSet.next();
            return Response.ok(Map.of(
                    "status", "UP",
                    "database", resultSet.getString(1)))
                    .build();
        } catch (Exception ex) {
            return Response.serverError()
                    .entity(Map.of(
                            "status", "DOWN",
                            "error", ex.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/lote/{token}")
    public Response obtenerResumenLote(@PathParam("token") String token) {
        try {
            LoteResumenDto dto = npsPublicService.obtenerResumenLote(token);
            if (dto == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "Lote no encontrado para el token especificado."))
                        .build();
            }
            return Response.ok(dto).build();
        } catch (NpsException ex) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/ingesta")
    public Response ingesta(NpsIngestaRequest request) {
        try {
            NpsIngestaResponse response = npsPublicService.registrarEvaluacion(request);
            return Response.ok(response).build();
        } catch (NpsException ex) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/productos")
    public Response obtenerProductosPublicos() {
        try {
            return Response.ok(npsPublicService.obtenerProductosPublicos()).build();
        } catch (Exception ex) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        }
    }
}
