package org.acme.nps;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.io.IOException;
import java.util.Map;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class SecurityFilter implements ContainerRequestFilter {

    @Inject
    TokenService tokenService;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String path = requestContext.getUriInfo().getPath();
        
        // Solo proteger endpoints bajo "/api/nps/admin"
        if (path.startsWith("api/nps/admin") || path.startsWith("/api/nps/admin")) {
            // Permitir OPTIONS preflight requests sin validar token para CORS
            if ("OPTIONS".equalsIgnoreCase(requestContext.getMethod())) {
                return;
            }

            String authHeader = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);
            
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                abortWithUnauthorized(requestContext, "Acceso denegado: Token faltante.");
                return;
            }
            
            String token = authHeader.substring(7).trim();
            try {
                TokenService.DecodedToken jwt = tokenService.verificarToken(token);
                requestContext.setProperty("username", jwt.getSubject());
                requestContext.setProperty("role", jwt.getRole());
            } catch (Exception e) {
                abortWithUnauthorized(requestContext, "Sesión inválida o expirada.");
            }
        }
    }

    private void abortWithUnauthorized(ContainerRequestContext requestContext, String message) {
        requestContext.abortWith(Response.status(Response.Status.UNAUTHORIZED)
                .entity(Map.of("error", message))
                .type(jakarta.ws.rs.core.MediaType.APPLICATION_JSON)
                .build());
    }
}
