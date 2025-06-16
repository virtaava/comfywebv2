<script lang="ts">
    import "./app.css";
    import { onMount } from "svelte";

    import { errorMessage, serverHost, infoMessage, hasSessionData, clearComfyWebSession, workflowDocumentation } from "./stores";

    import DropFileContainer from "./containers/DropFileContainer.svelte";
    import SidebarContainer from "./containers/SidebarContainer.svelte";
  import WorkflowDocumentationPanel from "./components/WorkflowDocumentationPanel.svelte";
    import MainWorkspace from "./components/MainWorkspace.svelte";
    import NotificationToastComponent from "./components/NotificationToastComponent.svelte";

    onMount(() => {
        // Check if we restored session data and notify user
        if (hasSessionData()) {
            const message = "Previous session restored. Your work has been recovered.";
            infoMessage.set(message);
            console.info("ComfyWeb session data restored successfully");
        }
    });

    function handleClearSession() {
        clearComfyWebSession();
        window.location.reload();
    }
</script>

<main class="dark h-full flex flex-row">
    <NotificationToastComponent
        bind:message={$errorMessage}
        type="error"
        timeout={8}
    />
    <NotificationToastComponent
        bind:message={$infoMessage}
        type="info"
        timeout={4}
    />
    <DropFileContainer />
    <SidebarContainer />
    <!-- Main Workspace with Generation Progress and Previews -->
    <MainWorkspace />
</main>
