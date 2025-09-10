## FROM amazonlinux:2
##
## ARG version=21.0.7.6-1
##
## # Build
## RUN apt-get update
## RUN apt-get install -y maven
## # RUN ["mvn", "clean", "package"]
## COPY pom.xml /app/pom.xml
## COPY src /app/src
## WORKDIR /app
## RUN mvn clean package
#
#FROM debian:bookworm-slim AS build
#
## install corretto after verifying that the key is the one we expect.
## and keep openssh client
#RUN apt-get update \
#  && apt-get install -y curl gnupg openssh-client \
#  && export GNUPGHOME="$(mktemp -d)" \
#  && curl -fL https://apt.corretto.aws/corretto.key -o corretto.key \
#  && echo '5fdaed0a262b975776b1d5c0170d2e86b1be1e98b27ef97114b04ec9ac7f011d *corretto.key' | sha256sum -c - \
#  && gpg --batch --import corretto.key \
#  && rm corretto.key \
#  && gpg --batch --export '6DC3636DAE534049C8B94623A122542AB04F24E3' > /usr/share/keyrings/corretto.gpg \
#  && unset GNUPGHOME \
#  && echo "deb [signed-by=/usr/share/keyrings/corretto.gpg] https://apt.corretto.aws stable main" > /etc/apt/sources.list.d/corretto.list \
#  && apt-get update \
#  && apt-get remove --purge --autoremove -y curl gnupg \
#  && apt-get install -y java-21-amazon-corretto-jdk \
#  && rm -rf /var/lib/apt/lists/*
#
## set JAVA_HOME manually since nothing else will set it
#ENV JAVA_HOME="/usr/lib/jvm/java-21-amazon-corretto"
#
## common for all images
#LABEL org.opencontainers.image.title="Apache Maven"
#LABEL org.opencontainers.image.source=https://github.com/carlossg/docker-maven
#LABEL org.opencontainers.image.url=https://github.com/carlossg/docker-maven
#LABEL org.opencontainers.image.description="Apache Maven is a software project management and comprehension tool. Based on the concept of a project object model (POM), Maven can manage a project's build, reporting and documentation from a central piece of information."
#
#ENV MAVEN_HOME=/usr/share/maven
#
#COPY --from=maven:3.9.9-eclipse-temurin-17 ${MAVEN_HOME} ${MAVEN_HOME}
#COPY --from=maven:3.9.9-eclipse-temurin-17 /usr/local/bin/mvn-entrypoint.sh /usr/local/bin/mvn-entrypoint.sh
#COPY --from=maven:3.9.9-eclipse-temurin-17 /usr/share/maven/ref/settings-docker.xml /usr/share/maven/ref/settings-docker.xml
#
#RUN ln -s ${MAVEN_HOME}/bin/mvn /usr/bin/mvn
#
#ARG MAVEN_VERSION=3.9.9
#ARG USER_HOME_DIR="/root"
#ENV MAVEN_CONFIG="$USER_HOME_DIR/.m2"
#
#ENTRYPOINT ["/usr/local/bin/mvn-entrypoint.sh"]
#CMD ["mvn"]
#COPY pom.xml /app/pom.xml
#COPY src /app/src
#RUN mvn -f /app/pom.xml clean package
#
## From Package
#FROM amazonlinux:2
#
#ARG version=21.0.7.6-1
## FROM amazonlinux:2
##
## ARG version=21.0.7.6-1
## In addition to installing the Amazon corretto, we also install
## fontconfig. The folks who manage the docker hub's
## official image library have found that font management
## is a common usecase, and painpoint, and have
## recommended that Java images include font support.
##
## See:
##  https://github.com/docker-library/official-images/blob/master/test/tests/java-uimanager-font/container.java
#
## The logic and code related to Fingerprint is contributed by @tianon in a Github PR's Conversation
## Comment = https://github.com/docker-library/official-images/pull/7459#issuecomment-592242757
## PR = https://github.com/docker-library/official-images/pull/7459
#RUN set -eux \
#    && export GNUPGHOME="$(mktemp -d)" \
#    && curl -fL -o corretto.key https://yum.corretto.aws/corretto.key \
#    && gpg --batch --import corretto.key \
#    && gpg --batch --export --armor '6DC3636DAE534049C8B94623A122542AB04F24E3' > corretto.key \
#    && rpm --import corretto.key \
#    && rm -r "$GNUPGHOME" corretto.key \
#    && curl -fL -o /etc/yum.repos.d/corretto.repo https://yum.corretto.aws/corretto.repo \
#    && grep -q '^gpgcheck=1' /etc/yum.repos.d/corretto.repo \
#    && echo "priority=9" >> /etc/yum.repos.d/corretto.repo \
#    && yum install -y java-21-amazon-corretto-devel-$version \
#    && (find /usr/lib/jvm/java-21-amazon-corretto -name src.zip -delete || true) \
#    && yum install -y fontconfig \
#    && yum clean all
#
#ENV LANG=C.UTF-8
#ENV JAVA_HOME=/usr/lib/jvm/java-21-amazon-corretto
#
#VOLUME /tmp
#COPY --from=build app/target/*.jar app.jar
#ENTRYPOINT ["java", "-jar", "/app.jar"]

FROM maven:3.9.11 AS build
CMD ["mvn"]
COPY pom.xml /app/pom.xml
COPY src /app/src
RUN mvn -f /app/pom.xml clean package

#
# Package stage
#
FROM eclipse-temurin:21
COPY --from=build app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]