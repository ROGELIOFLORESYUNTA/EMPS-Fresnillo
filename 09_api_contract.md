# API Contract

## Projects

GET /api/projects
POST /api/projects
GET /api/projects/{id}
PUT /api/projects/{id}
DELETE /api/projects/{id}

## Modules

POST /api/projects/{id}/modules
GET /api/projects/{id}/modules
PUT /api/modules/{id}
DELETE /api/modules/{id}

## Stories

POST /api/modules/{id}/stories
GET /api/modules/{id}/stories
PUT /api/stories/{id}
DELETE /api/stories/{id}

## Estimates

POST /api/projects/{id}/estimate
GET /api/projects/{id}/estimates
GET /api/estimates/{id}

## Changes

POST /api/projects/{id}/changes
GET /api/projects/{id}/changes
PUT /api/changes/{id}

## Parameters

GET /api/parameters
POST /api/parameters
PUT /api/parameters/{id}

## Reports

GET /api/projects/{id}/report/municipal
GET /api/projects/{id}/report/provider
GET /api/projects/{id}/report/research
