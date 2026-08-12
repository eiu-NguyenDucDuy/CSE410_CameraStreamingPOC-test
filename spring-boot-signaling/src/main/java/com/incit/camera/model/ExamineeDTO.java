package com.incit.camera.model;

import java.util.ArrayList;
import java.util.List;

public class ExamineeDTO {
    private String id;
    private String name;
    private String status;
    private boolean cameraEnabled;
    private boolean screenSharing;
    private String socketId;
    private long joinedAt;
    private List<String> warnings;

    public ExamineeDTO() {
        this.warnings = new ArrayList<>();
    }

    public ExamineeDTO(String id, String name, String status, boolean cameraEnabled, boolean screenSharing, String socketId) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.cameraEnabled = cameraEnabled;
        this.screenSharing = screenSharing;
        this.socketId = socketId;
        this.joinedAt = System.currentTimeMillis();
        this.warnings = new ArrayList<>();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isCameraEnabled() { return cameraEnabled; }
    public void setCameraEnabled(boolean cameraEnabled) { this.cameraEnabled = cameraEnabled; }

    public boolean isScreenSharing() { return screenSharing; }
    public void setScreenSharing(boolean screenSharing) { this.screenSharing = screenSharing; }

    public String getSocketId() { return socketId; }
    public void setSocketId(String socketId) { this.socketId = socketId; }

    public long getJoinedAt() { return joinedAt; }
    public void setJoinedAt(long joinedAt) { this.joinedAt = joinedAt; }

    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings; }
}
