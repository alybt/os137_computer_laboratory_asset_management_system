<?php
declare(strict_types=1);
namespace Clams\Support;
final class HttpError extends \RuntimeException {
    public function __construct(string $message, public readonly int $status=422) { parent::__construct($message); }
}
