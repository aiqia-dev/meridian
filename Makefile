all: meridian-server meridian-cli meridian-benchmark meridian-luamemtest

.PHONY: meridian-server
meridian-server:
	@./scripts/build.sh meridian-server

.PHONY: meridian-cli
meridian-cli:
	@./scripts/build.sh meridian-cli

.PHONY: meridian-benchmark
meridian-benchmark:
	@./scripts/build.sh meridian-benchmark

.PHONY: meridian-luamemtest
meridian-luamemtest:
	@./scripts/build.sh meridian-luamemtest

test: all
	@./scripts/test.sh

package:
	@rm -rf packages/
	@scripts/package.sh Windows windows amd64
	@scripts/package.sh Mac     darwin  amd64
	@scripts/package.sh Linux   linux   amd64
	@scripts/package.sh FreeBSD freebsd amd64
	@scripts/package.sh ARM     linux   arm
	@scripts/package.sh ARM64   linux   arm64

clean:
	rm -rf meridian-server meridian-cli meridian-benchmark meridian-luamemtest

distclean: clean
	rm -rf packages/

install: all
	cp meridian-server /usr/local/bin
	cp meridian-cli /usr/local/bin
	cp meridian-benchmark /usr/local/bin

uninstall:
	rm -f /usr/local/bin/meridian-server
	rm -f /usr/local/bin/meridian-cli
	rm -f /usr/local/bin/meridian-benchmark
