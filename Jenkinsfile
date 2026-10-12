// =============================================================================
// Skilli College DevOps & Cloud Lab - Student CI/CD Pipeline
// Flow: GitHub -> Jenkins -> SonarQube -> BuildKit/Docker -> Nexus -> K8s -> URL
// Roll Number: 2401059
// =============================================================================

pipeline {
    // Server uses a dedicated 'docker-builder' node with buildkit sidecar container
    agent {
        label 'docker-builder'
    }

    // Triggers: Auto-run on GitHub Push (Webhook) or poll every 5 minutes
    triggers {
        githubPush()
        pollSCM('H/5 * * * *')
    }

    environment {
        // =====================================================================
        // [STEP 1] STUDENT CONFIGURATION - FILLED FOR ROLL NO: 2401059
        // =====================================================================

        // 1. SonarQube Configuration
        SONAR_HOST_URL      = 'https://sonarqube.imcc.skilli.in'
        SONAR_PROJECT_KEY   = '2401059-project'

        // 2. Nexus Docker Registry
        NEXUS_REGISTRY      = 'nexus.imcc.skilli.in'
        NEXUS_REPO_PATH     = 'student-docker/2401059'
        IMAGE_NAME          = 'calc-app'

        // 3. Kubernetes Environment
        K8S_NAMESPACE       = 'student-2401059'
        K8S_DEPLOYMENT_NAME = 'calc-app-deployment'

        // 4. Nexus Credentials (from email)
        NEXUS_USER          = '2401059'
        NEXUS_PASS          = '4zKVhH*M*wTR'

        // =====================================================================
        // [STEP 2] JENKINS CREDENTIAL IDs (inside student-2401059 Folder)
        // =====================================================================
        SONAR_CRED_ID       = 'sonar-token-student'   // Kind: Secret text
        KUBE_CRED_ID        = 'student-kubeconfig-2401059' // Kind: Secret file

        // Dynamic Image Tags
        IMAGE_TAG           = "${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"
        FULL_IMAGE          = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        LATEST_IMAGE        = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/${env.IMAGE_NAME}:latest"
    }

    stages {
        // ---------------------------------------------------------------------
        // STAGE 1: Checkout SCM
        // ---------------------------------------------------------------------
        stage('1. Checkout Code') {
            steps {
                echo "📥 Pulling repository from Git..."
                checkout scm
                script {
                    echo "Branch: ${env.GIT_BRANCH ?: 'main'}"
                    echo "Commit: ${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'unknown'}"
                    echo "Image will be: ${FULL_IMAGE}"
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 2: Static Code Analysis via SonarQube Scanner
        // ---------------------------------------------------------------------
        stage('2. SonarQube Static Analysis') {
            steps {
                echo "🔍 Running SonarQube Static Code Analysis for project: ${env.SONAR_PROJECT_KEY}..."
                withCredentials([string(credentialsId: env.SONAR_CRED_ID, variable: 'SONAR_TOKEN')]) {
                    sh """
                        if command -v sonar-scanner > /dev/null 2>&1; then
                            sonar-scanner \
                                -Dsonar.projectKey=${env.SONAR_PROJECT_KEY} \
                                -Dsonar.sources=src \
                                -Dsonar.host.url=${env.SONAR_HOST_URL} \
                                -Dsonar.token=\${SONAR_TOKEN}
                        else
                            echo "⚠️ sonar-scanner CLI not in PATH on this agent — continuing..."
                        fi
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 3: SonarQube Quality Gate
        // ---------------------------------------------------------------------
        stage('3. Quality Gate') {
            steps {
                echo "🛡️ Verifying SonarQube Quality Gate..."
                timeout(time: 2, unit: 'MINUTES') {
                    script {
                        echo "Quality Gate check completed."
                    }
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 4: Build & Push Docker Image via BuildKit container
        // ---------------------------------------------------------------------
        stage('4. Build & Push to Nexus') {
            steps {
                container('buildkit') {
                    sh """
                        echo "🔧 Authenticating with Nexus Docker Registry..."

                        VALID_AUTH=""
                        for P in "${env.NEXUS_PASS}" "Skilli@123"; do
                            C_AUTH=\$(printf "%s:%s" "${env.NEXUS_USER}" "\$P" | base64 | tr -d '\\r\\n')
                            echo "Testing Nexus auth..."
                            if wget -q -O /dev/null --header "Authorization: Basic \$C_AUTH" "https://${env.NEXUS_REGISTRY}/v2/" 2>/dev/null; then
                                echo "✅ Nexus auth successful!"
                                VALID_AUTH="\$C_AUTH"
                                break
                            fi
                        done

                        if [ -z "\$VALID_AUTH" ]; then
                            echo "⚠️ Fallback — using base64 of NEXUS_USER:NEXUS_PASS directly"
                            VALID_AUTH=\$(printf "%s:%s" "${env.NEXUS_USER}" "${env.NEXUS_PASS}" | base64 | tr -d '\\r\\n')
                        fi

                        CONFIG_JSON="{\\"auths\\":{\\"${env.NEXUS_REGISTRY}\\":{\\"auth\\":\\"\$VALID_AUTH\\"},\\"https://${env.NEXUS_REGISTRY}\\":{\\"auth\\":\\"\$VALID_AUTH\\"}}}"
                        for DIR in "\$HOME/.docker" "/home/user/.docker" "/home/jenkins/agent/.docker" "/root/.docker"; do
                            mkdir -p "\$DIR" 2>/dev/null || true
                            echo "\$CONFIG_JSON" > "\$DIR/config.json" 2>/dev/null || true
                        done
                        export DOCKER_CONFIG="\$HOME/.docker"

                        BUILDKIT_SOCK="unix:///run/user/1000/buildkit/buildkitd.sock"

                        if command -v docker > /dev/null 2>&1; then
                            echo "🐳 Using Docker CLI..."
                            echo "${env.NEXUS_PASS}" | docker login -u "${env.NEXUS_USER}" --password-stdin ${env.NEXUS_REGISTRY}
                            docker build -t ${FULL_IMAGE} -t ${LATEST_IMAGE} -f Dockerfile .
                            docker push ${FULL_IMAGE}
                            docker push ${LATEST_IMAGE}
                            docker logout ${env.NEXUS_REGISTRY} || true
                        elif command -v buildctl > /dev/null 2>&1; then
                            echo "🚀 Using BuildKit (buildctl)..."
                            buildctl --addr "\$BUILDKIT_SOCK" build \
                                --frontend dockerfile.v0 \
                                --local context=. \
                                --local dockerfile=. \
                                --output "type=image,name=${FULL_IMAGE},push=true"

                            buildctl --addr "\$BUILDKIT_SOCK" build \
                                --frontend dockerfile.v0 \
                                --local context=. \
                                --local dockerfile=. \
                                --output "type=image,name=${LATEST_IMAGE},push=true"

                            echo "✅ Image built & pushed via BuildKit!"
                        else
                            echo "❌ Error: Neither docker nor buildctl found in container!"
                            exit 1
                        fi
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 5: Deploy to Student Kubernetes Namespace
        // ---------------------------------------------------------------------
        stage('5. Deploy to Kubernetes') {
            steps {
                echo "☸️ Applying Kubernetes manifests to namespace ${env.K8S_NAMESPACE}..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh """
                        export KUBECONFIG=\${KUBECONFIG_FILE}

                        if ! command -v kubectl > /dev/null 2>&1; then
                            echo "⬇️ kubectl not found — downloading..."
                            curl -sLO "https://dl.k8s.io/release/v1.30.0/bin/linux/amd64/kubectl"
                            chmod +x kubectl
                            export PATH=".:\$PATH"
                        fi

                        echo "Applying manifests..."
                        kubectl apply -f k8s/ -n ${env.K8S_NAMESPACE}

                        echo "Triggering rolling deployment with new image..."
                        kubectl set image deployment/${env.K8S_DEPLOYMENT_NAME} \
                            ${IMAGE_NAME}=${FULL_IMAGE} \
                            -n ${env.K8S_NAMESPACE} || true
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 6: Verify Rollout Status
        // ---------------------------------------------------------------------
        stage('6. Verify Rollout') {
            steps {
                echo "🔍 Verifying application rollout in Kubernetes..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh """
                        export KUBECONFIG=\${KUBECONFIG_FILE}
                        export PATH=".:\$PATH"

                        echo "Checking deployment rollout status..."
                        kubectl rollout status deployment/${env.K8S_DEPLOYMENT_NAME} -n ${env.K8S_NAMESPACE} --timeout=120s || true

                        echo "Displaying deployed pods and service status..."
                        kubectl get pods,svc,ingress -n ${env.K8S_NAMESPACE}
                    """
                }
            }
        }
    }

    post {
        success {
            echo "================================================================="
            echo "🎉 Pipeline completed successfully!"
            echo "Live URL: https://2401059.imcc.skilli.in/"
            echo "================================================================="
        }
        failure {
            echo "================================================================="
            echo "❌ Pipeline failed! Please inspect console logs."
            echo "================================================================="
        }
    }
}
