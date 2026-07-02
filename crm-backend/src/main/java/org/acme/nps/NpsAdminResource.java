package org.acme.nps;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@Path("/api/nps/admin")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class NpsAdminResource {

    @Inject
    NpsAdminService npsAdminService;

    @ConfigProperty(name = "app.frontend.url", defaultValue = "http://localhost:5173")
    String frontendUrl;

    @GET
    @Path("/alertas")
    public List<NpsAdminService.Alerta> obtenerAlertas() {
        return npsAdminService.obtenerAlertas();
    }

    @POST
    @Path("/alertas/{id}/resolver")
    public Response resolverAlerta(@PathParam("id") String id, Map<String, String> body) {
        String comentario = body != null ? body.get("comentario") : null;
        try {
            npsAdminService.resolverAlerta(id, comentario);
            return Response.ok(Map.of("mensaje", "Alerta resuelta exitosamente.")).build();
        } catch (IllegalArgumentException | NpsException ex) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        } catch (Exception ex) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Error interno al resolver la alerta: " + ex.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/etiqueta/{token}/qr")
    @Produces("image/png")
    public Response getEtiquetaQr(@PathParam("token") String token) {
        try {
            // La URL que el QR debe abrir (configurada mediante la propiedad app.frontend.url)
            String baseUrl = frontendUrl.endsWith("/") ? frontendUrl : frontendUrl + "/";
            String surveyUrl = baseUrl + "?token=" + token;
            QRCodeWriter qrWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrWriter.encode(surveyUrl, BarcodeFormat.QR_CODE, 250, 250);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            return Response.ok(baos.toByteArray()).type("image/png").build();
        } catch (WriterException | IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("QR generation failed").build();
        }
    }




    // Eliminamos la generación de QR para cupones (no se usa para la encuesta)
    // Si en el futuro se necesita, se puede re‑activar este endpoint.
    
    @GET
    @Path("/cupon/{code}/qr")
    @Produces("image/png")
    public Response getCuponQr(@PathParam("code") String code) {
        try {
            QRCodeWriter qrWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrWriter.encode(code, BarcodeFormat.QR_CODE, 150, 150);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            return Response.ok(baos.toByteArray()).type("image/png").build();
        } catch (WriterException | IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("QR generation failed").build();
        }
    }




    // Deactivate coupon endpoint
    @POST
    @Path("/cupon/{code}/desactivar")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response desactivarCupon(@PathParam("code") String code) {
        try {
            npsAdminService.desactivarCupon(code);
            return Response.ok().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/resumen")
    public NpsAdminService.Resumen obtenerResumen() {
        return npsAdminService.obtenerResumen();
    }
    @GET
    @Path("/cupones")
    public List<NpsAdminService.Cupon> obtenerCupones() {
        return npsAdminService.obtenerCupones();
    }

    @GET
    @Path("/evaluaciones")
    public List<NpsAdminService.EvaluacionDetalle> obtenerEvaluaciones() {
        return npsAdminService.obtenerEvaluaciones();
    }

    @GET
    @Path("/productos")
    public List<ProductoDto> obtenerProductos() {
        return npsAdminService.obtenerProductos();
    }

    @POST
    @Path("/productos")
    public Response registrarProducto(ProductoDto request) {
        try {
            ProductoDto dto = npsAdminService.registrarProducto(request);
            return Response.ok(dto).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @PUT
    @Path("/productos/{id}")
    public Response actualizarProducto(@PathParam("id") long id, ProductoDto request) {
        try {
            ProductoDto dto = npsAdminService.actualizarProducto(id, request);
            return Response.ok(dto).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }


    @GET
    @Path("/lotes")
    public List<LoteDto> obtenerLotes() {
        return npsAdminService.obtenerLotes();
    }

    @POST
    @Path("/lotes")
    public Response registrarLote(LoteCrearRequest request) {
        try {
            LoteDto dto = npsAdminService.registrarLote(request);
            return Response.ok(dto).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/maquinas")
    public List<MaquinaDto> obtenerMaquinas() {
        return npsAdminService.obtenerMaquinas();
    }

    @POST
    @Path("/maquinas")
    public Response registrarMaquina(MaquinaDto request) {
        try {
            MaquinaDto dto = npsAdminService.registrarMaquina(request);
            return Response.ok(dto).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/maquinas/{id}/toggle")
    public Response toggleMaquinaActivo(@PathParam("id") long id) {
        try {
            npsAdminService.toggleMaquinaActivo(id);
            return Response.ok().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/usuarios")
    public List<UsuarioDto> obtenerUsuarios() {
        return npsAdminService.obtenerUsuarios();
    }

    @POST
    @Path("/usuarios")
    public Response registrarUsuario(UsuarioDto request) {
        try {
            UsuarioDto dto = npsAdminService.registrarUsuario(request);
            return Response.ok(dto).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/usuarios/{id}/toggle")
    public Response toggleUsuarioActivo(@PathParam("id") long id) {
        try {
            npsAdminService.toggleUsuarioActivo(id);
            return Response.ok().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/lotes/{idLote}/procesos")
    public List<LoteProcesoDto> obtenerProcesosPorLote(@PathParam("idLote") long idLote) {
        return npsAdminService.obtenerProcesosPorLote(idLote);
    }

    @POST
    @Path("/lotes/{idLote}/procesos")
    public Response registrarProceso(@PathParam("idLote") long idLote, LoteProcesoDto request) {
        try {
            LoteProcesoDto dto = npsAdminService.registrarProceso(idLote, request);
            return Response.ok(dto).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/ventas")
    public List<VentaDto> obtenerVentas() {
        return npsAdminService.obtenerVentas();
    }

    @GET
    @Path("/ventas/resumen")
    public NpsAdminService.ResumenVentas obtenerResumenVentas() {
        return npsAdminService.obtenerResumenVentas();
    }

    @POST
    @Path("/ventas")
    public Response registrarVenta(VentaCrearRequest request) {
        try {
            VentaDto dto = npsAdminService.registrarVenta(request);
            return Response.ok(dto).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/clientes")
    public List<ClienteDto> obtenerClientes() {
        return npsAdminService.obtenerClientes();
    }

    @GET
    @Path("/inventario")
    public List<InventarioDto> obtenerInventario() {
        return npsAdminService.obtenerInventario();
    }
}

