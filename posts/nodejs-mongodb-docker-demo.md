Source: [TechWorld with Nana](https://youtu.be/3c-iBn73dDE)

![Docker](https://developers.redhat.com/sites/default/files/styles/article_feature/public/blog/2014/05/homepage-docker-logo.png?itok=zx0e-vcP)

## Introduction

In modern application development, containerization has become a game-changer. Docker provides a seamless way to package applications and their dependencies, ensuring consistent deployment across different environments. In this tutorial we'll walk through building a simple user-profile app using Docker, Node.js (with Express) and MongoDB. By the end you'll have a clear understanding of how to containerize applications, manage data storage with volumes, and troubleshoot common issues.

## Prerequisites

Make sure you have the following installed:

1. **Docker** — the containerization platform.
2. **Docker Compose** — a tool for defining and running multi-container applications.

## Application architecture

Our user-profile app has three components:

1. **Frontend** — the user interface, built using `index.html`.
2. **Backend** — the server logic, powered by Node.js and Express.
3. **Database** — MongoDB, which stores user-profile data.

## Clone the repository

```bash
git clone https://gitlab.com/nanuchi/techworld-js-docker-demo-app
```

## Setting up MongoDB and MongoDB Express

Pull the Mongo images:

```bash
docker pull mongo
docker pull mongo-express
```

## Creating the Docker image for the application

Create a `Dockerfile` in the root directory of the app:

```dockerfile
# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port that the app runs on
EXPOSE 3000

# Define the command to run your app
CMD ["node", "index.js"]
```

## Containerizing the application

Build the image:

```bash
docker build -t user-profile-app .
```

## Creating a Docker network

```bash
docker network create user-profile-network
```

## Running MongoDB

Start the MongoDB container, attached to the network:

```bash
docker run -d --name user-profile-db --network user-profile-network mongo
```

## Running MongoDB Express

Launch MongoDB Express to manage the database:

```bash
docker run -d --name mongo-express \
  --network user-profile-network \
  -e ME_CONFIG_MONGODB_SERVER=user-profile-db \
  -p 8081:8081 \
  mongo-express
```

## Running the user-profile application

Run the app container on the same network:

```bash
docker run -d --name user-profile-app \
  --network user-profile-network \
  -e MONGO_URL=mongodb://user-profile-db:27017/user-profile-db \
  -p 3000:3000 \
  user-profile-app
```

## Running everything with Docker Compose

A `docker-compose.yml` makes the whole thing one command:

```yaml
version: '3'
services:
  app:
    image: user-profile-app
    ports:
      - "3000:3000"
    networks:
      - user-profile-network
    environment:
      - MONGO_URL=mongodb://mongo:27017/user-profile-db

  mongo:
    image: mongo
    networks:
      - user-profile-network
    volumes:
      - mongo-data:/data/db

  mongo-express:
    image: mongo-express
    networks:
      - user-profile-network
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_URL=mongodb://mongo:27017/

networks:
  user-profile-network:
volumes:
  mongo-data:
```

## Conclusion

By leveraging Docker, we've built a simple user-profile app using Node.js, Express and MongoDB — and seen how containers interact with each other through a shared network, with data persisted via a named volume. As you keep exploring, look into Docker's more advanced features (health checks, multi-stage builds, image optimisation) and best practices around secrets and configuration. Happy shipping!
