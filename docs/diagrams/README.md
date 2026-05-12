# Architecture Diagrams

This folder contains Mermaid diagram files (`.mmd`) that visualize the system architecture.

## Viewing Diagrams

### Option 1: VS Code Extension
Install the "Mermaid Preview" extension in VS Code to view diagrams directly.

### Option 2: Online Editor
Copy the contents to [Mermaid Live Editor](https://mermaid.live/)

### Option 3: GitHub
GitHub automatically renders Mermaid diagrams in markdown files.

## Diagrams

| File | Description |
|------|-------------|
| `system-architecture.mmd` | High-level system architecture showing layers |
| `workflow-states.mmd` | State machine diagram for CR workflow |
| `approval-flow.mmd` | Multi-step approval process visualization |
| `role-hierarchy.mmd` | RBAC role hierarchy and permissions |
| `data-flow.mmd` | Sequence diagrams for key operations |
| `database-schema.mmd` | Entity-relationship diagram |

## Generating Images

To generate PNG/SVG images from these diagrams:

```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Generate PNG
mmdc -i system-architecture.mmd -o system-architecture.png

# Generate SVG
mmdc -i system-architecture.mmd -o system-architecture.svg

# Generate all diagrams
for f in *.mmd; do mmdc -i "$f" -o "${f%.mmd}.png"; done
```
