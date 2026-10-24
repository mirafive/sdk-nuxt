<script setup lang="ts">
const mira = useMira()
</script>

<template>
  <main>
    <h1>MIRA FIVE playground</h1>
    <button type="button" @click="mira.consent(true)">Allow statistics</button>
    <button type="button" @click="mira.track('signup', { plan: 'pro' })">Track signup</button>
  </main>
</template>
