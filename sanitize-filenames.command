#!/bin/bash

# Prompt the user for the directory containing the files
read -p "Please enter the path to the folder: " PATHNAME

DIRECTORY="${HOME}/$PATHNAME"

# Check if the provided path is a valid directory
if [ ! -d "$DIRECTORY" ]; then
    echo "The path you entered is not a valid directory."
    exit 1
fi

# Loop through all files in the directory
for FILE in "$DIRECTORY"/*; do
    # Extract the base name and the extension
    BASENAME=$(basename "$FILE")
    
    # Check if the file name contains a space before the extension
    if [[ "$BASENAME" =~ \ \. ]]; then
        DIRNAME=$(dirname "$FILE")
        
        # Remove the space before the extension
        NEWNAME=$(echo "$BASENAME" | sed 's/ \././')
        
        # Rename the file
        mv "$FILE" "$DIRNAME/$NEWNAME"
        echo "Renamed '$BASENAME' to '$NEWNAME'"
    fi
done
