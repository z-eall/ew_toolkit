### Site
- Leaving the validator (closing the tab, clicking a nav link, or reloading) now reliably warns about unsaved work — and only once. It previously could show two stacked "leave site?" dialogs on a single leave.

### Legacy format
- The legacy-filename notice now reads as a template (`expand_data*.yaml`) instead of echoing back the specific uploaded filename, and clarifies that the renamed file should move into the `/config/data` directory.

### Custom saved key
- The unmatched-custom-key notice now points at `expand_prefabs*/ewp_data.yaml` instead of the incorrect `expand_world/ewp_data.yaml` path.
