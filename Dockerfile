# Dockerfile for KiiConf
# Jacob Alexander 2017

# Ubuntu 16.04 LTS (xenial) base
FROM ubuntu:xenial

LABEL maintainer="haata@kiibohd.com" \
    version="0.1" \
    description="Docker Environment for Kiibohd KiiConf Web Configurator"

# Install dependencies
RUN apt-get update \
    && \
    apt-get install -qy \
binutils-arm-none-eabi \
bsdmainutils \
cmake \
ctags \
dfu-util \
gcc-arm-none-eabi \
git \
libnewlib-arm-none-eabi \
libusb-1.0-0-dev \
lighttpd \
ninja-build \
nodejs \
npm \
php-cgi \
python3 \
python3-pil \
tmux \
    && \
    rm -rf /var/lib/apt/lists/*

# Add this git repo
ADD . /KiiConf
WORKDIR /KiiConf

# Clone git repos for controller build
ARG URL
ARG BRANCH
ARG REV
ARG KLL_URL
ARG KLL_BRANCH
ARG KLL_REV
RUN cd /KiiConf && tools/update_controller.bash

# Prepare tmp directory
RUN mkdir -p /KiiConf/tmp && chmod 777 /KiiConf/tmp

# Prepare lighttpd
# Defaults to test_lighttpd.conf
RUN mkdir -p /var/run/lighttpd && chown www-data:www-data /var/run/lighttpd
RUN touch /var/run/lighttpd.pid && chown www-data:www-data /var/run/lighttpd.pid
ARG lighttpd_conf=test_lighttpd.conf
ADD ${lighttpd_conf} /etc/lighttpd/lighttpd.conf
EXPOSE 80 443

# Default command, starting lighttpd
CMD /usr/sbin/lighttpd -D -f /etc/lighttpd/lighttpd.conf

# NOTE: Test user is uid:gid 33:33 (typically http/www-data on Ubuntu and Arch Linux)

# 1. Build the image after the initial cloning of this repo
#   docker build -t kiiconf . # notice the dot at the end
# You can control controller.git and kll.git using the following docker build flags
#  --build-arg BRANCH=old --build-arg REV=HEAD
#  - URL        - controller.git url
#  - BRANCH     - controller.git branch
#  - REV        - controller.git revision
#  - KLL_URL    - kll.git url
#  - KLL_BRANCH - kll.git branch
#  - KLL_REV    - kll.git revision

# 2. Quick test generating a container from the image and running a command
#   docker run -t -u 33:33 --rm kiiconf cgi-bin/build_layout.bash c3184563548ed992bfd3574a238d3289 MD1
#  OR
#   docker run -t -u 33:33 --rm kiiconf tests/build_test.bash
#  OR (if you want to be lazy and test)
#   tests/docker_test.bash
#
# Change the MD1 for other build targets in cgi-bin/build_layout.bash
# For example:
#  - MD1
#  - MD1.1
#  - MDErgo1
#  - WhiteFox
#  - KType

# 3. Run the a container in interactive mode
#  docker run -it -u 33:33 --rm kiiconf bash
# Run a command manually, like:
#  cgi-bin/build_layout.bash c3184563548ed992bfd3574a238d3289 MD1

# NOTE: --rm means the container contents will disappear after the container exits

# 4. Run all of KiiConf, using lighttpd inside the docker container
#  docker run kiiconf
# OR (to use localhost instead)
#  docker run -p 127.0.0.1:80:80 kiiconf

# 5. Run all of KiiConf, using lighttpd inside docker container, and detach to the background
#  docker run -d kiiconf
# OR (to use localhost instead)
#  docker run -p 127.0.0.1:80:80 -d kiiconf

