# User Service - EduLearn Microservices Project

The **User Service** is a microservice in the EduLearn platform responsible for managing courses, sections, lessons, quizzes, enrollments, and user progress. It is built using **NestJS**, **gRPC** for inter-service communication, **Kafka** for async communication, **Redis** for caching, and **TypeORM** with **PostgreSQL** for persistence. The service adheres to **Clean Architecture**, **SOLID principles**, and **NestJS best practices**.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Service](#running-the-service)
- [API Documentation](#api-documentation)
  - [gRPC Endpoints](#grpc-endpoints)
  - [HTTP Endpoints](#http-endpoints)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **User Management**: Create, retrieve, and update courses, sections, lessons, and quizzes.
- **Enrollment**: Enroll users in courses and track their progress.
- **Progress Tracking**: Update and retrieve user progress for lessons.
- **Async Communication**: Publish events (e.g., enrollment, lesson completion) to Kafka.
- **Caching**: Use Redis to cache frequently accessed course data.
- **Inter-Service Communication**: Communicate with other services (e.g., User Service) via gRPC.
- **Monitoring**: Expose metrics via Prometheus for observability.
- **Health Checks**: Provide an HTTP endpoint for monitoring the service's health.

## Technologies

- **NestJS**: Framework for building scalable Node.js applications.
- **gRPC**: High-performance RPC framework for inter-service communication.
- **Kafka**: Distributed event streaming platform for async communication.
- **Redis**: In-memory data store for caching.
- **TypeORM**: ORM for PostgreSQL database interactions.
- **PostgreSQL**: Relational database for persistent storage.
- **Prometheus**: Monitoring and alerting toolkit for metrics.
- **Winston**: Logging library for structured logging.
- **Jest**: Testing framework for unit and integration tests.

## Prerequisites

Before setting up the User Service, ensure you have the following installed:

- **Node.js** (v18.x or later)
- **npm** (v9.x or later)
- **PostgreSQL** (v15.x or later)
- **Redis** (v7.x or later)
- **Kafka** (v3.x or later, with Zookeeper)
- **Docker** (optional, for running dependencies in containers)

You’ll also need:

- A running **User Service** (for gRPC communication to fetch user details).
- Access to a Kafka broker for async events.
- Access to a Redis instance for caching.

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/edulearn/course-service.git
cd course-service
```

# User Service - EduLearn Microservices Project

[...]

## Monitoring

The User Service provides comprehensive monitoring and observability through Prometheus metrics and OpenTelemetry tracing.

### Prometheus Metrics

The service exposes metrics via the `/health/metrics` endpoint, which can be scraped by Prometheus. Key metrics include:

- `course_service_grpc_requests_total`: Total number of gRPC requests.
- `course_service_grpc_request_duration_seconds`: Latency of gRPC requests.

To set up Prometheus:

1. Configure Prometheus to scrape the `/health/metrics` endpoint.
2. Use Grafana to visualize the metrics.

### Distributed Tracing with OpenTelemetry

The service uses OpenTelemetry for distributed tracing, allowing you to track requests across services. Traces are exported to Jaeger for visualization.

#### Jaeger Setup

Jaeger is included in the `docker-compose.yml` file and runs on port `16686`. To view traces:

1. Start the dependencies using `docker-compose up -d`.
2. Access the Jaeger UI at `http://localhost:16686`.
3. Select `course-service` from the "Service" dropdown to view traces.

#### Key Traces

- **gRPC Requests**: Traces for all gRPC methods (e.g., `CreateUser`, `GetUser`).
- **Kafka Messages**: Traces for messages sent to Kafka (e.g., `LESSON_COMPLETED` events).
- **Database Interactions**: Traces for PostgreSQL queries via TypeORM.
- **Redis Operations**: Traces for cache operations.
- **Inter-Service Calls**: Traces for gRPC calls to the User Service.

[...]

API Documentation
gRPC Endpoints

The User Service exposes the following gRPC endpoints. The service definition is available in src/infrastructure/grpc/proto/course.proto.
Service: UserService

    URL: localhost:3001
    Package: course

Method Request Type Response Type Description
CreateUser CreateUserRequest UserResponse Creates a new course.
GetUser GetUserRequest UserResponse Retrieves a course by ID.
EnrollUser EnrollUserRequest EnrollmentResponse Enrolls a user in a course.
UpdateProgress UpdateProgressRequest ProgressResponse Updates user progress for a lesson.
AddSection AddSectionRequest SectionResponse Adds a section to a course.
AddLesson AddLessonRequest LessonResponse Adds a lesson to a section.
AddQuiz AddQuizRequest QuizResponse Adds a quiz to a course.
Example: Create a User

Request:
proto
message CreateUserRequest {
string title = 1;
string description = 2;
string instructor_id = 3;
}

Response:
proto
message UserResponse {
string id = 1;
string title = 2;
string description = 3;
string instructor_id = 4;
repeated SectionResponse sections = 5;
repeated QuizResponse quizzes = 6;
string created_at = 7;
string updated_at = 8;
}
HTTP Endpoints

The User Service exposes HTTP endpoints for health checks and metrics.
Health Check

    Endpoint: GET /health
    Description: Returns the health status of the service.
    Response:
    json

    {
      "status": "ok",
      "service": "User Service",
      "timestamp": "2025-06-01T03:38:00.000Z"
    }

Metrics

    Endpoint: GET /health/metrics
    Description: Exposes Prometheus metrics for monitoring.
    Response: Prometheus-compatible metrics (text format).

Testing
Run Unit Tests
bash
npm run test
Run Integration Tests

Integration tests require a test database (edulearn_test) and running dependencies (PostgreSQL, Redis, Kafka).
bash
npm run test:integration
Monitoring

The User Service exposes metrics via Prometheus, which can be scraped from the /health/metrics endpoint. Key metrics include:

    course_service_grpc_requests_total: Total number of gRPC requests.
    course_service_grpc_request_duration_seconds: Latency of gRPC requests.

To set up monitoring:

    Configure Prometheus to scrape the /health/metrics endpoint.
    Use Grafana to visualize the me

```
course-service/
├── src/
│   ├── domain/               # Core business logic (entities, repositories, services)
│   ├── application/          # Use cases, DTOs, interfaces
│   ├── infrastructure/       # External integrations (database, Kafka, Redis, gRPC)
│   ├── presentation/         # gRPC and HTTP controllers
│   ├── core/                # Constants and types
│   ├── main.ts              # Application entry point
│   └── app.module.ts        # Root module
├── tests/                   # Unit and integration tests
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker Compose for dependencies
├── package.json             # Dependencies and scripts
└── README.md                # Project documentation
```
