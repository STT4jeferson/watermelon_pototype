-- CreateTable
CREATE TABLE `empresa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `empresa_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `usuario_login_key`(`login`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registro` (
    `id` CHAR(36) NOT NULL,
    `empresa_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `data_hora` DATETIME(3) NOT NULL,
    `descricao` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `last_modified_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `foto_registro` (
    `id` CHAR(36) NOT NULL,
    `registro_id` CHAR(36) NOT NULL,
    `empresa_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `local_path` TEXT NULL,
    `remote_url` TEXT NULL,
    `mime_type` VARCHAR(191) NULL,
    `file_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `last_modified_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro` ADD CONSTRAINT `registro_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro` ADD CONSTRAINT `registro_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_registro` ADD CONSTRAINT `foto_registro_registro_id_fkey` FOREIGN KEY (`registro_id`) REFERENCES `registro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_registro` ADD CONSTRAINT `foto_registro_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_registro` ADD CONSTRAINT `foto_registro_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
