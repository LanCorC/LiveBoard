#inspiration: https://stackoverflow.com/questions/27767264/how-to-dockerize-a-maven-project-how-many-ways-to-accomplish-it

#
# Maven Build Stage
#

# Loads maven,
FROM maven:3.9.11 AS build
CMD ["mvn"]
COPY pom.xml /app/pom.xml
COPY src /app/src
# packages app into .jar
RUN mvn -f /app/pom.xml clean package

#
# JRE run stage
#

# Loads amazon corretto 21
FROM eclipse-temurin:21
# retrieves, from Maven Build Stage, the resulting .jar into variable "app.jar"
COPY --from=build app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]