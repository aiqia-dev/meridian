FROM alpine:3.20

ARG VERSION
ARG TARGETOS
ARG TARGETARCH

RUN apk add --no-cache ca-certificates

ADD packages/meridian-$VERSION-$TARGETOS-$TARGETARCH/meridian-server /usr/local/bin
ADD packages/meridian-$VERSION-$TARGETOS-$TARGETARCH/meridian-cli /usr/local/bin
ADD packages/meridian-$VERSION-$TARGETOS-$TARGETARCH/meridian-benchmark /usr/local/bin

RUN addgroup -S meridian && \
    adduser -S -G meridian meridian && \
    mkdir /data && chown meridian:meridian /data

VOLUME /data

EXPOSE 9851
CMD ["meridian-server", "-d", "/data"]
