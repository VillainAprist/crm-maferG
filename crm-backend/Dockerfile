# Etapa 1: Compilar la aplicación Quarkus con Maven y OpenJDK 17
FROM maven:3.8.5-openjdk-17 AS build
COPY src /usr/src/app/src
COPY pom.xml /usr/src/app
RUN mvn -f /usr/src/app/pom.xml clean package -DskipTests

# Etapa 2: Crear la imagen de ejecución ligera basada en RedHat OpenJDK 17
FROM registry.access.redhat.com/ubi8/openjdk-17:1.20

ENV LANGUAGE='en_US:en'

# Copiar el compilado de Quarkus desde la etapa anterior
COPY --from=build --chown=185 /usr/src/app/target/quarkus-app/lib/ /deployments/lib/
COPY --from=build --chown=185 /usr/src/app/target/quarkus-app/*.jar /deployments/
COPY --from=build --chown=185 /usr/src/app/target/quarkus-app/app/ /deployments/app/
COPY --from=build --chown=185 /usr/src/app/target/quarkus-app/quarkus/ /deployments/quarkus/

EXPOSE 8080
USER 185

# Configurar variables de ejecución de Quarkus
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENV JAVA_APP_JAR="/deployments/quarkus-run.jar"

ENTRYPOINT [ "/opt/jboss/container/java/run/run-java.sh" ]
