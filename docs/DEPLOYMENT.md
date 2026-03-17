# Deployment Guide for NAS

This guide explains how to deploy the **11+ Vocabulary Master** application to a Network Attached Storage (NAS) device that supports Docker (e.g., Synology, QNAP, TrueNAS).

## Prerequisites
1.  **Docker Support**: Your NAS must have Docker (often called "Container Manager" on Synology) installed.
2.  **SSH Access**: Recommended for running commands, though some steps can be done via the NAS web UI.
3.  **Port Availability**: Ensure ports `8080` (Frontend) and `9876` (Backend) are free on your NAS.

## Step 1: Prepare the Application
Before moving files, ensure you have the latest production build configuration.

1.  **Check Environment Variables**:
    Required file: `.env` (at the repository root)
    Ensure it exists. If not, copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
    *Note: You may need to update `VITE_API_URL` if you plan to access the app from other devices (see [Configuration checks](#configuration-checks)).*

2.  **Verify Data**:
    Ensure `packages/frontend/src/assets/words.json` is present and populated.

## Step 2: Transfer Files to NAS
You need to copy the repository to your NAS.

**Method A: SMB/Network Share (Easiest)**
1.  Mount your NAS shared folder on your computer.
2.  Create a folder on the NAS (e.g., `/docker/vocab-master`).
3.  Copy all files from the repository root to the NAS folder.
    *   *Exclude*: `node_modules`, `.git`, `dist` (these will be rebuilt/ignored).

**Method B: SCP/Command Line**
```bash
scp -r . user@nas-ip:/volume1/docker/vocab-master
```

## Step 3: Run with Docker Compose
1.  **SSH into your NAS**:
    ```bash
    ssh user@your-nas-ip
    ```
2.  **Navigate to the project root**:
    ```bash
    cd /volume1/docker/vocab-master
    ```
    The `docker-compose.yml` file is at the repository root.
3.  **Start the application**:
    ```bash
    sudo docker-compose up -d --build
    ```
    *   `-d`: Detached mode (runs in background).
    *   `--build`: Forces a rebuild of the images to ensure they match your source code.

## Step 4: Verify Deployment
1.  Open your browser.
2.  Go to `http://<your-nas-ip>:8080`.
3.  The application should load.

## Configuration Checks

### Accessing from other devices (Important!)
By default, the frontend tries to call the API at `http://localhost:9876`.
- If you access the app from your phone or another laptop, `localhost` will refer to *that* device, not the NAS.
- **Fix**: You generally need to configure the frontend to know the NAS's IP address.

**Option 1: Rebuild with Environment Variable**
1.  Open `docker-compose.yml`.
2.  Under the `frontend` service, add/update the `args` or `environment`:
    ```yaml
    frontend:
      build:
        args:
          VITE_API_URL: "http://<your-nas-ip>:9876"
    ```
3.  Rebuild: `docker-compose up -d --build`

**Option 2: Nginx Reverse Proxy (Advanced)**
If you want to access it via a domain (e.g., `vocab.mynas.com`), configure your NAS's Reverse Proxy settings to point to `localhost:8080` and `localhost:9876`.

## Troubleshooting

- **"Connection Refused"**: Check if the container is running:
  ```bash
  docker ps
  ```
- **Backend Health Check Fails**: View logs:
  ```bash
  docker logs vocab-master-backend
  ```
- **Permission Errors**: Ensure the user running docker has permission to read the files in the directory.
