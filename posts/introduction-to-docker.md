![Docker](https://d1.awsstatic.com/acs/characters/Logos/Docker-Logo_Horizontel_279x131.b8a5c41e56b77706656d61080f6a0217a3ba356d.png)

This post gives a basic understanding of containers and the popular containerization tool, Docker.

## Docker images & containers

> According to [Docker](https://www.docker.com/resources/what-container/), a Docker **container image** is a lightweight, standalone, executable package of software that includes everything needed to run an application: code, runtime, system tools, system libraries and settings.

Think of a Docker image as a blueprint or a recipe for creating a container that can run your application. It includes all the necessary ingredients — your application code, its dependencies, and configuration details.

Just like you use a recipe to make a cake, you use a Docker image to create a container that runs your application. And just like you can make multiple cakes from the same recipe, you can create multiple containers from the same image.

The main advantage of Docker images is that they are portable and run consistently across different environments — your laptop, a cloud server, or a colleague's machine. They are also lightweight and efficient, making them easy to share and deploy.

A **container** is a standard unit of software that packages up code and all its dependencies so the application runs quickly and reliably from one computing environment to another.

> According to [IBM](https://www.ibm.com/topics/containerization#toc-what-is-co-r25Smlqq), containerization is the packaging of software code with just the operating system (OS) libraries and dependencies required to run the code to create a single lightweight executable — called a container — that runs consistently on any infrastructure.

Now that we know about images and containers, let's talk about Docker itself.

**Docker** is a popular open-source platform for building, packaging, and deploying applications in containers.

Docker makes it easy to create and manage containers by providing a simple and consistent interface for building, running, and sharing them. Docker also includes a container registry — such as Docker Hub — where you can store and share container images with others.

Overall, Docker provides a powerful and efficient way to package and deploy applications, which is why it's such a popular choice for containerization in DevOps and cloud-native environments.

---

### References

1. [freeCodeCamp — The Docker Handbook](https://www.freecodecamp.org/news/the-docker-handbook/)
2. [Docker documentation](https://docs.docker.com/)
