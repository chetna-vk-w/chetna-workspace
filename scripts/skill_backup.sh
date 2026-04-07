#!/bin/bash

# OpenClaw Skills Backup & Restore System
# Author: Anvi
# Purpose: Standardize backup/restore for all skills to prevent loss during experiments.

BACKUP_DIR="/root/.openclaw/workspace/backups/skills"
SKILLS_DIR="/usr/lib/node_modules/openclaw/skills"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

usage() {
    echo "Usage: $0 {backup|restore} [skill_name]"
    echo "  backup [skill_name]  - Backup all skills or a specific skill to $BACKUP_DIR"
    echo "  restore [skill_name] - Restore a specific skill from the latest backup"
    exit 1
}

if [ "$1" == "backup" ]; then
    if [ -n "$2" ]; then
        # Backup specific skill
        SKILL_NAME=$2
        if [ -d "$SKILLS_DIR/$SKILL_NAME" ]; then
            echo "📦 Backing up skill: $SKILL_NAME..."
            mkdir -p "$BACKUP_DIR/$SKILL_NAME"
            cp -r "$SKILLS_DIR/$SKILL_NAME/." "$BACKUP_DIR/$SKILL_NAME/"
            echo "✅ Skill $SKILL_NAME backed up to $BACKUP_DIR/$SKILL_NAME"
        else
            echo "❌ Error: Skill $SKILL_NAME not found in $SKILLS_DIR"
            exit 1
        fi
    else
        # Backup all skills (versioned)
        echo "📦 Backing up all skills to $BACKUP_DIR/all_$TIMESTAMP..."
        mkdir -p "$BACKUP_DIR/all_$TIMESTAMP"
        cp -r "$SKILLS_DIR" "$BACKUP_DIR/all_$TIMESTAMP/"
        echo "✅ All skills backed up successfully."
    fi

elif [ "$1" == "restore" ]; then
    if [ -z "$2" ]; then
        echo "❌ Error: Restore requires a skill name."
        usage
    fi
    
    SKILL_NAME=$2
    # Find the most recent backup for this skill
    # Check both the specific folder and the latest 'all_' archive
    LATEST_ALL=$(ls -td $BACKUP_DIR/all_* 2>/dev/null | head -n 1)
    
    if [ -d "$BACKUP_DIR/$SKILL_NAME" ]; then
        echo "🔄 Restoring skill $SKILL_NAME from dedicated backup..."
        cp -r "$BACKUP_DIR/$SKILL_NAME/." "$SKILLS_DIR/$SKILL_NAME/"
        echo "✅ Skill $SKILL_NAME restored."
    elif [ -n "$LATEST_ALL" ] && [ -d "$LATEST_ALL/$SKILL_NAME" ]; then
        echo "🔄 Restoring skill $SKILL_NAME from latest all-skills backup ($LATEST_ALL)..."
        cp -r "$LATEST_ALL/$SKILL_NAME/." "$SKILLS_DIR/$SKILL_NAME/"
        echo "✅ Skill $SKILL_NAME restored."
    else
        echo "❌ Error: No backup found for skill $SKILL_NAME"
        exit 1
    fi

else
    usage
fi
